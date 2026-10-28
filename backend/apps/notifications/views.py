"""
Notification API views for in-app alerting, status updates, and SSE streaming.

Provides endpoints for:
- Paginated notification retrieval with optional read-status filtering.
- Real-time Server-Sent Events (SSE) notification streaming.
- Fast unread count querying for badge indicators.
- Single and bulk read-state mutation.
"""

from django.shortcuts import get_object_or_404
from django.db.models import Count
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.pagination import ResourcePagination
from apps.core.sse import EventStreamRenderer, after_cursor, event_cursor, stream_response
from rest_framework.renderers import JSONRenderer
from apps.notifications.models import Notification
from apps.notifications.serializers import NotificationSerializer
from api.models import ProjectChatMessage, Task, TaskDependency, UserData
from apps.roles.permissions import has_permission, scope_queryset
from apps.approvals.views import review_tasks, managed_dependencies


def sidebar_counts(user):
    counts = {}

    def add(rows, project_field, label):
        for row in rows.values(project_field).annotate(total=Count('pk', distinct=True)).order_by():
            project = str(row[project_field])
            bucket = counts.setdefault(project, {'Tasks': 0, 'Dependencies': 0, 'Approvals': 0})
            bucket[label] += row['total']

    if has_permission(user, 'Tasks', 'View'):
        add(scope_queryset(user, 'task', Task.objects.filter(assigned_to=user, status='open')), 'project_id', 'Tasks')
        if has_permission(user, 'Approvals', 'View'):
            add(review_tasks(user), 'project_id', 'Approvals')
    if has_permission(user, 'Dependencies', 'View'):
        add(scope_queryset(user, 'dependency', TaskDependency.objects.filter(status='started')),
            'task__project_id', 'Dependencies')
        if has_permission(user, 'Approvals', 'View'):
            add(managed_dependencies(user), 'task__project_id', 'Approvals')
    return counts


class NotificationListView(APIView):
    """
    List paginated notifications belonging to the requesting user.

    Supports optional filtering by read status via `?is_read=true` or `?is_read=false`.
    Enriches serialized notifications with related project names by querying the associated
    task, dependency, or chat message targets.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Handle GET requests to retrieve paginated notifications for the user.

        Args:
            request (Request): DRF request object with query parameters.

        Returns:
            Response: Paginated list of serialized `Notification` dictionaries.

        Raises:
            ValidationError: If `is_read` is provided but is not 'true' or 'false'.
        """
        queryset = Notification.objects.filter(user=request.user)
        if 'is_read' in request.query_params:
            value = request.query_params['is_read'].lower()
            if value not in ('true', 'false'):
                raise ValidationError({'is_read': 'Use true or false.'})
            queryset = queryset.filter(is_read=value == 'true')
        paginator = ResourcePagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        task_ids = [item.resource_id for item in page if item.notification_type.startswith('task_')]
        dependency_ids = [item.resource_id for item in page if item.notification_type.startswith('dependency_')]
        message_ids = [item.resource_id for item in page if item.notification_type == Notification.CHAT_MENTION]
        project_names = dict(Task.objects.filter(pk__in=task_ids).values_list('pk', 'project__project_name'))
        project_names.update(TaskDependency.objects.filter(pk__in=dependency_ids)
                             .values_list('pk', 'task__project__project_name'))
        project_names.update(ProjectChatMessage.objects.filter(pk__in=message_ids)
                             .values_list('pk', 'room__project__project_name'))
        response = paginator.get_paginated_response(NotificationSerializer(
            page, many=True, context={'project_names': project_names}).data)
        response.data['unread_count'] = Notification.objects.filter(user=request.user, is_read=False).count()
        response.data['sidebar_counts'] = sidebar_counts(request.user)
        return response


class NotificationStreamView(APIView):
    """
    Real-time Server-Sent Events (SSE) stream for user notifications.

    Pushes new notification events to the client in real-time. Supports client-side
    reconnection via standard `Last-Event-ID` cursor headers.
    """
    renderer_classes = [EventStreamRenderer, JSONRenderer]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Open a persistent SSE streaming HTTP connection.

        Args:
            request (Request): DRF request containing headers (including Last-Event-ID).

        Returns:
            StreamingHttpResponse: Infinite chunked SSE event stream.
        """
        user_id = request.user.pk
        queryset = Notification.objects.filter(user_id=user_id)
        cursor = event_cursor(queryset, request.headers.get('Last-Event-ID'))

        def fetch(after):
            """Fetch batch of notifications created after the cursor timestamp."""
            if not UserData.objects.filter(pk=user_id, account_status='active').exists():
                raise PermissionDenied('Notification access denied.')
            notifications = list(after_cursor(
                Notification.objects.filter(user_id=user_id), after)[:50])
            return [(item.pk, item.created_at, NotificationSerializer(item).data)
                    for item in notifications]

        return stream_response(fetch, cursor, 'new_notification')


class UnreadCountView(APIView):
    """
    Provide the instantaneous count of unread notifications for the user.

    Useful for lightweight header and badge polling without fetching full payloads.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Return the unread notification tally.

        Args:
            request (Request): DRF request for authenticated user.

        Returns:
            Response: JSON containing `{"count": <int>}`.
        """
        return Response({'count': Notification.objects.filter(user=request.user, is_read=False).count()})


class NotificationReadView(APIView):
    """
    Mark an individual notification as read.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, notification_id):
        """
        Update the `is_read` flag of a specific notification belonging to the user.

        Args:
            request (Request): DRF request.
            notification_id (int): Primary key of the notification to mark read.

        Returns:
            Response: Serialized representation of the updated notification.
        """
        notification = get_object_or_404(Notification, pk=notification_id, user=request.user)
        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=['is_read'])
        return Response(NotificationSerializer(notification).data)


class NotificationMarkAllReadView(APIView):
    """
    Mark all unread notifications for the requesting user as read in a single batch.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        """
        Execute a bulk update setting `is_read=True` on all unread notifications.

        Args:
            request (Request): DRF request.

        Returns:
            Response: JSON payload with `{"updated": <count>}`.
        """
        updated = Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'updated': updated}, status=status.HTTP_200_OK)

