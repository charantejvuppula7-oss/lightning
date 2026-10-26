from django.db import transaction
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import ResourceFile
from apps.audit.services import LogService
from apps.roles.permissions import allowed_projects, require_permission
from apps.documents.serializers import DocumentSerializer


def documents_for(user):
    return ResourceFile.objects.filter(project__in=allowed_projects(user)).select_related('project', 'uploaded_by')


def delete_document(request, document):
    LogService.log_audit_event(actor=request.user, action='deleted', entity_type='document', entity=document, request=request)
    # Retain the stored file: historical project records can reference the same upload.
    document.delete()


class DocumentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        require_permission(request.user, 'Documents', 'View')
        queryset = documents_for(request.user).order_by('-uploaded_at')
        project = request.query_params.get('project_id')
        if project:
            project = serializers.UUIDField().run_validation(project)
            get_object_or_404(allowed_projects(request.user), pk=project)
            queryset = queryset.filter(project_id=project)
        return Response(DocumentSerializer(queryset, many=True).data)

    def post(self, request):
        require_permission(request.user, 'Documents', 'Create')
        project_id = serializers.UUIDField().run_validation(request.data.get('project'))
        project = get_object_or_404(allowed_projects(request.user), pk=project_id)
        upload = request.FILES.get('file')
        if not upload:
            raise ValidationError({'file': 'Choose a file to upload.'})
        with transaction.atomic():
            document = ResourceFile.objects.create(project=project, file=upload, file_name=upload.name,
                file_type=ResourceFile.get_file_category(upload.name), file_size=upload.size, uploaded_by=request.user)
            LogService.log_audit_event(actor=request.user, action='created', entity_type='document', entity=document, request=request)
        return Response(DocumentSerializer(document).data, status=201)


class DocumentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, document_id):
        require_permission(request.user, 'Documents', 'Edit')
        with transaction.atomic():
            document = get_object_or_404(documents_for(request.user), pk=document_id)
            serializer = DocumentSerializer(document, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            LogService.log_audit_event(actor=request.user, action='renamed', entity_type='document', entity=document, request=request)
        return Response(serializer.data)

    def delete(self, request, document_id):
        require_permission(request.user, 'Documents', 'Delete')
        with transaction.atomic():
            document = get_object_or_404(documents_for(request.user), pk=document_id)
            delete_document(request, document)
        return Response({'message': 'Document deleted.'})


class DocumentBulkDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        require_permission(request.user, 'Documents', 'Delete')
        ids = request.data.get('ids')
        ids = serializers.ListField(child=serializers.UUIDField(), allow_empty=False, max_length=500).run_validation(ids)
        with transaction.atomic():
            documents = list(documents_for(request.user).filter(pk__in=ids))
            if len(documents) != len(set(ids)):
                raise Http404
            for document in documents:
                delete_document(request, document)
        return Response({'message': f'Deleted {len(documents)} documents.'})


class DocumentDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, document_id):
        require_permission(request.user, 'Documents', 'View')
        document = get_object_or_404(documents_for(request.user), pk=document_id)
        try:
            return FileResponse(document.file.open('rb'), as_attachment=True, filename=document.file_name)
        except FileNotFoundError as error:
            raise Http404('The stored file is unavailable.') from error
