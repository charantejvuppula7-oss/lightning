from django.db import transaction
from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response

from api.models import Task, TaskDependency, UserData
from apps.core.pagination import ResourcePagination
from apps.users.serializers import ProfileUpdateSerializer, UserSerializer
from apps.users.filters import filter_users
from apps.notifications.services import schedule_account_notice
from apps.core.views import ResourceAPIView
from apps.roles.permissions import allowed_projects, require_permission
from apps.audit.services import LogService
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView


USER_QUERYSET = UserData.objects.select_related('role_link', 'department_link').prefetch_related('default_projects', 'skills__skill_link')


class UserListCreateView(ResourceAPIView):
    resource = 'user'
    audit_entity = 'user_account'
    queryset = USER_QUERYSET

    def get(self, request):
        queryset = filter_users(self.authorized_queryset(request), request.query_params)
        paginator = ResourcePagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(UserSerializer(page, many=True).data)

    def post(self, request):
        serializer = UserSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            instance = serializer.save()
            self.audit(request, instance, 'created')
            schedule_account_notice(instance, request.user)
        return Response(UserSerializer(instance).data, status=status.HTTP_201_CREATED)


class UserDetailView(ResourceAPIView):
    resource = 'user'
    audit_entity = 'user_account'
    queryset = USER_QUERYSET

    def get(self, request, user_id):
        instance = self.authorized_object(request, user_id)
        return Response(UserSerializer(instance).data)

    def put(self, request, user_id):
        with transaction.atomic():
            instance = self.authorized_object(request, user_id, lock=True)
            serializer = UserSerializer(instance, data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            instance = serializer.save()
            self.audit(request, instance, 'updated')
        return Response(UserSerializer(instance).data)

    def patch(self, request, user_id):
        with transaction.atomic():
            instance = self.authorized_object(request, user_id, lock=True)
            serializer = UserSerializer(instance, data=request.data, partial=True, context={'request': request})
            serializer.is_valid(raise_exception=True)
            instance = serializer.save()
            self.audit(request, instance, 'updated')
        return Response(UserSerializer(instance).data)

    def delete(self, request, user_id):
        with transaction.atomic():
            instance = self.authorized_object(request, user_id, lock=True)
            instance.account_status = 'inactive'
            instance.save(update_fields=['account_status', 'updated_at'])
            self.audit(request, instance, 'deactivated')
        return Response(UserSerializer(instance).data, status=status.HTTP_200_OK)


class ProjectUserWorkloadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        require_permission(request.user, 'TeamWorLoad', 'View')
        project = get_object_or_404(allowed_projects(request.user), pk=project_id)
        params = request.query_params.copy()
        params['project'] = str(project.pk)
        users = filter_users(UserData.objects.all(), params)
        paginator = ResourcePagination()
        page = paginator.paginate_queryset(users, request, view=self)
        user_ids = [user.pk for user in page]

        task_counts = {user_id: {} for user_id in user_ids}
        for row in (Task.objects.filter(project=project, assigned_to_id__in=user_ids)
                    .values('assigned_to_id', 'status').annotate(count=Count('pk'))):
            task_counts[row['assigned_to_id']][row['status']] = row['count']

        dependency_counts = {user_id: {} for user_id in user_ids}
        for row in (TaskDependency.objects.filter(task__project=project, assigned_to_id__in=user_ids)
                    .values('assigned_to_id', 'status').annotate(count=Count('pk'))):
            dependency_counts[row['assigned_to_id']][row['status']] = row['count']

        results = []
        for user in page:
            tasks = task_counts[user.pk]
            dependencies = dependency_counts[user.pk]
            results.append({
                'id': user.pk,
                'user_name': user.user_name,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'task_counts': tasks,
                'dependency_counts': dependencies,
                'active_tasks': sum(count for state, count in tasks.items() if state != 'completed'),
                'active_dependencies': sum(count for state, count in dependencies.items()
                                           if state != 'completed'),
            })
        return paginator.get_paginated_response(results)


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        with transaction.atomic():
            user = UserData.objects.select_for_update().get(pk=request.user.pk)
            serializer = ProfileUpdateSerializer(user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
            LogService.log_audit_event(actor=user, action='updated_profile', entity_type='user_account',
                                       entity=user, request=request)
        return Response(UserSerializer(user).data)


