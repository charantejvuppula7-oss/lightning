from django.db import transaction
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Project, Customer, Priority, ProjectType, Department, UserData, ResourceFile
from apps.core.pagination import ResourcePagination
from apps.projects.serializers import ProjectSerializer, ProjectCreateSerializer, ProjectCreationResponseSerializer
from apps.projects.services import create_project
from apps.projects.filters import filter_projects
from apps.core.views import ResourceAPIView
from apps.roles.permissions import assigned_projects, has_permission, is_admin


PROJECT_QUERYSET = Project.objects.select_related('created_by', 'customer_link', 'priority_link', 'project_type_link').prefetch_related('team_members', 'project_managers', 'departments', 'links')


class ProjectSetupOptionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not any(has_permission(request.user, 'project', action)
                   for action in ('read', 'create', 'update')):
            raise PermissionDenied('Access denied.')
        users = UserData.objects.filter(account_status='active')
        if not is_admin(request.user):
            from django.db.models import Q
            users = users.filter(Q(pk=request.user.pk) | Q(manager=request.user))
        return Response({
            'customers': list(Customer.objects.order_by('name').values('id', 'name')),
            'priorities': list(Priority.objects.order_by('sort_order', 'name').values('id', 'name')),
            'project_types': list(ProjectType.objects.order_by('name').values('id', 'name')),
            'departments': list(Department.objects.order_by('name').values('id', 'name')),
            'users': list(users.order_by(
                'first_name', 'last_name', 'pk').values(
                    'id', 'first_name', 'last_name', 'user_name', 'department_link_id',
                    'designation', 'role_link__name')),
        })


class AssignedProjectListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        projects = assigned_projects(request.user).order_by('project_name', 'pk').values('id', 'project_name')
        paginator = ResourcePagination()
        page = paginator.paginate_queryset(projects, request, view=self)
        return paginator.get_paginated_response(page)


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
            'milestones_set__features', 'sprints__team_members', 'sprints__off_days',
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


class ProjectSetupDetailView(ResourceAPIView):
    resource = 'project'
    queryset = PROJECT_QUERYSET

    def get(self, request, project_id):
        project = self.authorized_object(request, project_id)
        project = PROJECT_QUERYSET.prefetch_related(
            'milestones_set__features', 'sprints__team_members', 'sprints__off_days', 'tasks__dependencies',
        ).get(pk=project.pk)
        return Response(ProjectCreationResponseSerializer(project).data)


class ProjectFilesView(ResourceAPIView):
    resource = 'project'
    queryset = PROJECT_QUERYSET

    def get(self, request, project_id):
        project = self.authorized_object(request, project_id)
        return Response([{
            'id': item.pk, 'name': item.file_name, 'url': item.file.url,
            'size': item.file_size, 'is_pdr': item.is_pdr,
            'pdr_version': item.pdr_version, 'pdr_changelog': item.pdr_changelog,
        } for item in project.resource_files_set.order_by('uploaded_at')])

    def post(self, request, project_id):
        project = self.authorized_object(request, project_id)
        files = request.FILES.getlist('files')
        if not files:
            return Response({'files': 'Select at least one file.'}, status=status.HTTP_400_BAD_REQUEST)
        is_pdr = request.data.get('is_pdr') == 'true'
        with transaction.atomic():
            for file in files:
                ResourceFile.objects.create(
                    project=project, file=file, file_name=file.name,
                    file_size=file.size, file_type=ResourceFile.get_file_category(file.name),
                    is_pdr=is_pdr, pdr_version=request.data.get('pdr_version', '') if is_pdr else '',
                    pdr_changelog=request.data.get('pdr_changelog', '') if is_pdr else '',
                    uploaded_by=request.user,
                )
        return Response(status=status.HTTP_201_CREATED)

    def delete(self, request, project_id):
        project = self.authorized_object(request, project_id)
        file_id = request.data.get('id')
        item = project.resource_files_set.filter(pk=file_id).first()
        if item is None:
            return Response({'id': 'File not found.'}, status=status.HTTP_404_NOT_FOUND)
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

