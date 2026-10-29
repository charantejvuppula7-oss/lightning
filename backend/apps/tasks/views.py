from django.db import transaction
from rest_framework import status
from rest_framework.response import Response

from api.models import Task
from apps.core.pagination import ResourcePagination
from apps.tasks.serializers import TaskSerializer
from apps.tasks.filters import filter_tasks
from apps.notifications.services import schedule_assignment_notice
from apps.core.views import ResourceAPIView


TASK_QUERYSET = Task.objects.select_related('project', 'assigned_to', 'review_by', 'sprint', 'feature__Milestone').prefetch_related('dependencies', 'project__project_managers')


class TaskListCreateView(ResourceAPIView):
    """
    List tasks accessible by the user or create a new task within a project.
    """
    resource = 'task'
    queryset = TASK_QUERYSET

    def get(self, request):
        """
        List scoped tasks with filtering, sorting, and pagination.

        Args:
            request (Request): Incoming DRF request.

        Returns:
            Response: Paginated list of serialized tasks.
        """
        queryset = filter_tasks(self.authorized_queryset(request), request.query_params)
        paginator = ResourcePagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(TaskSerializer(page, many=True, context={'request': request}).data)

    def post(self, request):
        """
        Create a new task, record an audit event, and notify the assignee.

        Args:
            request (Request): DRF request with task payload.

        Returns:
            Response: Serialized task with HTTP 201 Created.
        """
        serializer = TaskSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            instance = serializer.save()
            self.audit(request, instance, 'created')
            schedule_assignment_notice(instance, request.user)
        return Response(TaskSerializer(instance, context={'request': request}).data, status=status.HTTP_201_CREATED)


class TaskDetailView(ResourceAPIView):
    """
    Retrieve, update, or delete an individual task.
    """
    resource = 'task'
    queryset = TASK_QUERYSET

    def get(self, request, task_id):
        """
        Retrieve details of a single task.

        Args:
            request (Request): Incoming DRF request.
            task_id (UUID): Task identifier.

        Returns:
            Response: Serialized task details.
        """
        instance = self.authorized_object(request, task_id)
        return Response(TaskSerializer(instance, context={'request': request}).data)

    def put(self, request, task_id):
        return self._update(request, task_id)

    def patch(self, request, task_id):
        return self._update(request, task_id, partial=True)

    def _update(self, request, task_id, partial=False):
        with transaction.atomic():
            instance = self.authorized_object(request, task_id, lock=True)
            previous_assignee_id = instance.assigned_to_id
            serializer = TaskSerializer(instance, data=request.data, partial=partial, context={'request': request})
            serializer.is_valid(raise_exception=True)
            instance = serializer.save()
            self.audit(request, instance, 'updated')
            if instance.assigned_to_id != previous_assignee_id:
                schedule_assignment_notice(instance, request.user)
        return Response(TaskSerializer(instance, context={'request': request}).data)

    def delete(self, request, task_id):
        """
        Delete a task after validating deletion constraints (dependencies, status).

        Args:
            request (Request): Incoming DRF request.
            task_id (UUID): Task identifier.

        Returns:
            Response: Empty response with HTTP 204 No Content.
        """
        with transaction.atomic():
            instance = self.authorized_object(request, task_id, lock=True)
            instance.validate_deletion()
            self.audit(request, instance, 'deleted')
            instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


