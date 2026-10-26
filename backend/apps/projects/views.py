from uuid import UUID

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
from apps.roles.permissions import allowed_projects, has_permission, is_admin, require_permission


PROJECT_QUERYSET = Project.objects.select_related('created_by', 'customer_link', 'priority_link', 'project_type_link').prefetch_related('team_members', 'project_managers', 'departments', 'links')


class ProjectSetupOptionsView(APIView):
    """
    Metadata endpoint providing lookup tables and available users required for project setup wizards.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Return customers, priorities, project types, departments, and active users within actor scope.

        Args:
            request (Request): Authenticated HTTP request.

        Returns:
            Response: Lookup dictionary for populating frontend project creation forms.

        Raises:
            PermissionDenied: If the user lacks project read, create, or update rights.
        """
        if not any(has_permission(request.user, 'project', action)
                   for action in ('read', 'create', 'update')):
            raise PermissionDenied('Access denied.')
        users = UserData.objects.filter(account_status='active')
        project = None
        if request.query_params.get('project'):
            from django.shortcuts import get_object_or_404
            from rest_framework import serializers
            project_id = serializers.UUIDField().run_validation(request.query_params['project'])
            project = get_object_or_404(allowed_projects(request.user),pk=project_id)
        if not is_admin(request.user):
            from django.db.models import Q
            scope = Q(pk=request.user.pk) | Q(manager=request.user)
            if project:
                scope |= Q(assigned_projects=project) | Q(managed_projects=project) | Q(default_projects=project) | Q(pk=project.created_by_id)
            users = users.filter(scope).distinct()
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
    """
    Endpoint providing lightweight list of projects assigned to the current user (for dropdown selectors).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        List minimal project representations (id and project_name) assigned to the user.

        Args:
            request (Request): Authenticated HTTP request.

        Returns:
            Response: Paginated project id/name tuples.
        """
        projects = allowed_projects(request.user).order_by('project_name', 'pk').values('id', 'project_name')
        paginator = ResourcePagination()
        page = paginator.paginate_queryset(projects, request, view=self)
        return paginator.get_paginated_response(page)


class ProjectListCreateView(ResourceAPIView):
    """
    Collection endpoint to list accessible projects or create an entire project work structure.
    """
    resource = 'project'
    queryset = PROJECT_QUERYSET

    def get(self, request):
        """
        List projects accessible to the user, with filtering, sorting, and pagination.

        Args:
            request (Request): Incoming DRF request.

        Returns:
            Response: Paginated list of serialized projects.
        """
        queryset = filter_projects(self.authorized_queryset(request), request.query_params)
        paginator = ResourcePagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(ProjectSerializer(page, many=True).data)

    def post(self, request):
        """
        Create a project along with nested milestones, sprints, tasks, and dependencies atomically.

        Args:
            request (Request): Payload conforming to ProjectCreateSerializer.

        Returns:
            Response: Full project creation representation and temporary ID reference mappings.
        """
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
    """
    Retrieve, update, or delete a single project instance.
    """
    resource = 'project'
    queryset = PROJECT_QUERYSET

    def get(self, request, project_id):
        """
        Retrieve complete details of a single authorized project.

        Args:
            request (Request): Incoming request.
            project_id (UUID): Project identifier.

        Returns:
            Response: Serialized project.
        """
        instance = self.authorized_object(request, project_id)
        return Response(ProjectSerializer(instance).data)

    def put(self, request, project_id):
        """
        Perform a full update of project attributes inside an atomic transaction.

        Args:
            request (Request): Incoming request.
            project_id (UUID): Project identifier.

        Returns:
            Response: Serialized updated project.
        """
        with transaction.atomic():
            instance = self.authorized_object(request, project_id, lock=True)
            serializer = ProjectSerializer(instance, data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            instance = serializer.save()
            self.audit(request, instance, 'updated')
        return Response(ProjectSerializer(instance).data)

    def patch(self, request, project_id):
        """
        Perform a partial update of project attributes inside an atomic transaction.

        Args:
            request (Request): Incoming request.
            project_id (UUID): Project identifier.

        Returns:
            Response: Serialized updated project.
        """
        with transaction.atomic():
            instance = self.authorized_object(request, project_id, lock=True)
            serializer = ProjectSerializer(instance, data=request.data, partial=True, context={'request': request})
            serializer.is_valid(raise_exception=True)
            instance = serializer.save()
            self.audit(request, instance, 'updated')
        return Response(ProjectSerializer(instance).data)

    def delete(self, request, project_id):
        """
        Delete a project after verifying deletion safety constraints.

        Args:
            request (Request): Incoming request.
            project_id (UUID): Project identifier.

        Returns:
            Response: Empty response with HTTP 204 No Content.
        """
        with transaction.atomic():
            instance = self.authorized_object(request, project_id, lock=True)
            instance.validate_deletion()
            self.audit(request, instance, 'deleted')
            instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectSetupDetailView(ResourceAPIView):
    """
    Endpoint providing the complete nested structure (milestones, sprints, tasks) for a project.
    """
    resource = 'project'
    queryset = PROJECT_QUERYSET

    def get(self, request, project_id):
        """
        Return pre-fetched deep hierarchy of a project for initialization and setup review.

        Args:
            request (Request): Incoming request.
            project_id (UUID): Project identifier.

        Returns:
            Response: Detailed project setup serialization.
        """
        project = self.authorized_object(request, project_id)
        project = PROJECT_QUERYSET.prefetch_related(
            'milestones_set__features', 'sprints__team_members', 'sprints__off_days', 'tasks__dependencies',
        ).get(pk=project.pk)
        return Response(ProjectCreationResponseSerializer(project).data)


class ProjectFilesView(ResourceAPIView):
    """
    File management view for attaching resource files and PDR documents to a project.
    """
    resource = 'project'
    queryset = PROJECT_QUERYSET
    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        """Perform custom HTTP method permission mapping for file operations."""
        super().initial(request, *args, **kwargs)
        if request.method == 'POST':
            if not (has_permission(request.user, 'project', 'create') or
                    has_permission(request.user, 'project', 'update')):
                raise PermissionDenied('Access denied.')
        elif request.method in ('PATCH', 'DELETE'):
            require_permission(request.user, 'project', 'update')
        elif request.method in ('GET', 'HEAD'):
            require_permission(request.user, 'project', 'read')

    def get(self, request, project_id):
        """
        List all resource and PDR files attached to the project.

        Args:
            request (Request): Incoming request.
            project_id (UUID): Project identifier.

        Returns:
            Response: List of file metadata dictionaries.
        """
        project = self.authorized_object(request, project_id)
        return Response([{
            'id': item.pk, 'name': item.file_name, 'url': item.file.url,
            'size': item.file_size, 'is_pdr': item.is_pdr,
            'pdr_version': item.pdr_version, 'pdr_changelog': item.pdr_changelog,
            'uploaded_at': item.uploaded_at,
            'uploaded_by_name': (
                f'{item.uploaded_by.first_name} {item.uploaded_by.last_name}'.strip()
                if item.uploaded_by else ''
            ),
        } for item in project.resource_files_set.select_related('uploaded_by').order_by('uploaded_at')])

    def post(self, request, project_id):
        """
        Upload one or more files to the project.

        Args:
            request (Request): Multipart form request with 'files' list.
            project_id (UUID): Project identifier.

        Returns:
            Response: HTTP 201 Created.
        """
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

    def patch(self, request, project_id):
        """
        Update version or changelog metadata for an existing PDR document.

        Args:
            request (Request): Request containing 'id', 'pdr_version', and 'pdr_changelog'.
            project_id (UUID): Project identifier.

        Returns:
            Response: Updated PDR metadata.
        """
        project = self.authorized_object(request, project_id)
        try:
            file_id = UUID(str(request.data.get('id')))
        except (ValueError, TypeError):
            return Response({'id': 'Invalid PDR file ID.'}, status=status.HTTP_400_BAD_REQUEST)
        item = project.resource_files_set.filter(pk=file_id, is_pdr=True).first()
        if item is None:
            return Response({'id': 'PDR file not found.'}, status=status.HTTP_404_NOT_FOUND)
        version = request.data.get('pdr_version', item.pdr_version)
        changelog = request.data.get('pdr_changelog', item.pdr_changelog)
        if not isinstance(version, str) or not isinstance(changelog, str) or len(version) > 50 or len(changelog) > 255:
            return Response({'detail': 'Invalid PDR details.'}, status=status.HTTP_400_BAD_REQUEST)
        item.pdr_version = version
        item.pdr_changelog = changelog
        item.save(update_fields=['pdr_version', 'pdr_changelog'])
        return Response({'id': item.pk, 'pdr_version': version, 'pdr_changelog': changelog})

    def delete(self, request, project_id):
        """
        Delete an attached file from the project.

        Args:
            request (Request): Request containing 'id' of file to delete.
            project_id (UUID): Project identifier.

        Returns:
            Response: HTTP 204 No Content.
        """
        project = self.authorized_object(request, project_id)
        file_id = request.data.get('id')
        item = project.resource_files_set.filter(pk=file_id).first()
        if item is None:
            return Response({'id': 'File not found.'}, status=status.HTTP_404_NOT_FOUND)
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


