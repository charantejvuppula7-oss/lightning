from django.db import transaction
from rest_framework import status
from rest_framework.response import Response

from api.models import Project
from apps.core.pagination import ResourcePagination
from apps.projects.serializers import ProjectSerializer, ProjectCreateSerializer, ProjectCreationResponseSerializer
from apps.projects.services import create_project
from apps.projects.filters import filter_projects
from apps.core.views import ResourceAPIView


PROJECT_QUERYSET = Project.objects.select_related('created_by', 'customer_link', 'priority_link', 'project_type_link').prefetch_related('team_members', 'project_managers', 'departments')


class ProjectListCreateView(ResourceAPIView):
    resource = 'project'
    queryset = PROJECT_QUERYSET

    def get(self, request):
        queryset = filter_projects(self.authorized_queryset(request), request.query_params)
        paginator = ResourcePagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(ProjectSerializer(page, many=True).data)

    def post(self, request):
        serializer = ProjectCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            instance, references = create_project(serializer.validated_data, request.user)
            self.audit(request, instance, 'created')
        instance = PROJECT_QUERYSET.prefetch_related(
            'milestones_set__features', 'sprints__team_members',
            'tasks__dependencies',
        ).get(pk=instance.pk)
        data = ProjectCreationResponseSerializer(instance).data
        data['references'] = references
        return Response(data, status=status.HTTP_201_CREATED)


class ProjectDetailView(ResourceAPIView):
    resource = 'project'
    queryset = PROJECT_QUERYSET

    def get(self, request, project_id):
        instance = self.authorized_object(request, project_id)
        return Response(ProjectSerializer(instance).data)

    def put(self, request, project_id):
        with transaction.atomic():
            instance = self.authorized_object(request, project_id, lock=True)
            serializer = ProjectSerializer(instance, data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            instance = serializer.save()
            self.audit(request, instance, 'updated')
        return Response(ProjectSerializer(instance).data)

    def patch(self, request, project_id):
        with transaction.atomic():
            instance = self.authorized_object(request, project_id, lock=True)
            serializer = ProjectSerializer(instance, data=request.data, partial=True, context={'request': request})
            serializer.is_valid(raise_exception=True)
            instance = serializer.save()
            self.audit(request, instance, 'updated')
        return Response(ProjectSerializer(instance).data)

    def delete(self, request, project_id):
        with transaction.atomic():
            instance = self.authorized_object(request, project_id, lock=True)
            instance.validate_deletion()
            self.audit(request, instance, 'deleted')
            instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

