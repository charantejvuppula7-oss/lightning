from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.pagination import ResourcePagination
from apps.core.sse import after_cursor, event_cursor, stream_response
from apps.notifications.models import Notification
from apps.notifications.serializers import NotificationSerializer
from api.models import UserData
from rest_framework.exceptions import PermissionDenied


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = Notification.objects.filter(user=request.user)
        if 'is_read' in request.query_params:
            value = request.query_params['is_read'].lower()
            if value not in ('true', 'false'):
                raise ValidationError({'is_read': 'Use true or false.'})
            queryset = queryset.filter(is_read=value == 'true')
        paginator = ResourcePagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(NotificationSerializer(page, many=True).data)


class NotificationStreamView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_id = request.user.pk
        queryset = Notification.objects.filter(user_id=user_id)
        cursor = event_cursor(queryset, request.headers.get('Last-Event-ID'))

        def fetch(after):
            if not UserData.objects.filter(pk=user_id, account_status='active').exists():
                raise PermissionDenied('Notification access denied.')
            notifications = list(after_cursor(
                Notification.objects.filter(user_id=user_id), after)[:50])
            return [(item.pk, item.created_at, NotificationSerializer(item).data)
                    for item in notifications]

        return stream_response(fetch, cursor, 'new_notification')


class UnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({'count': Notification.objects.filter(user=request.user, is_read=False).count()})


class NotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, notification_id):
        notification = get_object_or_404(Notification, pk=notification_id, user=request.user)
        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=['is_read'])
        return Response(NotificationSerializer(notification).data)


class NotificationMarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        updated = Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'updated': updated}, status=status.HTTP_200_OK)
