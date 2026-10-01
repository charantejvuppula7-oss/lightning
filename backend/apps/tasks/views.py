from django.db import transaction
from rest_framework import status
from rest_framework.response import Response

from api.models import Task
from apps.core.pagination import ResourcePagination
from apps.tasks.serializers import TaskSerializer
from apps.tasks.filters import filter_tasks
from apps.notifications.services import schedule_assignment_notice
from apps.core.views import ResourceAPIView


TASK_QUERYSET = Task.objects.select_related('project', 'assigned_to', 'review_by', 'sprint', 'feature')


class TaskListCreateView(ResourceAPIView):
    resource = 'task'
    queryset = TASK_QUERYSET

    def get(self, request):
        queryset = filter_tasks(self.authorized_queryset(request), request.query_params)
        paginator = ResourcePagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(TaskSerializer(page, many=True).data)

    def post(self, request):
        serializer = TaskSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            instance = serializer.save()
            self.audit(request, instance, 'created')
            schedule_assignment_notice(instance, request.user)
        return Response(TaskSerializer(instance).data, status=status.HTTP_201_CREATED)


class TaskDetailView(ResourceAPIView):
    resource = 'task'
    queryset = TASK_QUERYSET

    def get(self, request, task_id):
        instance = self.authorized_object(request, task_id)
        return Response(TaskSerializer(instance).data)

    def put(self, request, task_id):
        with transaction.atomic():
            instance = self.authorized_object(request, task_id, lock=True)
            previous_assignee_id = instance.assigned_to_id
            serializer = TaskSerializer(instance, data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            instance = serializer.save()
            self.audit(request, instance, 'updated')
            if instance.assigned_to_id != previous_assignee_id:
                schedule_assignment_notice(instance, request.user)
        return Response(TaskSerializer(instance).data)

    def patch(self, request, task_id):
        with transaction.atomic():
            instance = self.authorized_object(request, task_id, lock=True)
            previous_assignee_id = instance.assigned_to_id
            serializer = TaskSerializer(instance, data=request.data, partial=True, context={'request': request})
            serializer.is_valid(raise_exception=True)
            instance = serializer.save()
            self.audit(request, instance, 'updated')
            if instance.assigned_to_id != previous_assignee_id:
                schedule_assignment_notice(instance, request.user)
        return Response(TaskSerializer(instance).data)

    def delete(self, request, task_id):
        with transaction.atomic():
            instance = self.authorized_object(request, task_id, lock=True)
            instance.validate_deletion()
            self.audit(request, instance, 'deleted')
            instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

