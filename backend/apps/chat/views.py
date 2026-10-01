from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import ProjectChatMessage, UserData
from apps.chat.models import ChatTypingState
from apps.chat.serializers import ChatMessageSerializer, ChatSendSerializer, ChatTypingSerializer
from apps.chat.services import get_chat_room, save_chat_message
from apps.core.pagination import ResourcePagination
from apps.core.sse import after_cursor, event_cursor, stream_response
from apps.roles.permissions import has_permission


class ChatHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        room = get_chat_room(project_id, request.user)
        queryset = (ProjectChatMessage.objects.filter(room=room, parent_message__isnull=True)
                    if room else ProjectChatMessage.objects.none())
        queryset = queryset.select_related('sender', 'attachment', 'parent_message').order_by('-created_at', '-pk')
        paginator = ResourcePagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(ChatMessageSerializer(page, many=True).data)

    def post(self, request, project_id):
        serializer = ChatSendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message, created = save_chat_message(
            request.user, {**serializer.validated_data, 'project_id': project_id})
        return Response(ChatMessageSerializer(message).data,
                        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class ChatThreadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id, message_id):
        room = get_chat_room(project_id, request.user)
        parent = ProjectChatMessage.objects.filter(
            pk=message_id, room=room, parent_message__isnull=True).select_related('sender').first()
        if parent is None:
            raise NotFound('Message not found.')
        replies = ProjectChatMessage.objects.filter(parent_message=parent).select_related(
            'sender', 'attachment').order_by('created_at', 'pk')
        paginator = ResourcePagination()
        page = paginator.paginate_queryset(replies, request, view=self)
        response = paginator.get_paginated_response(ChatMessageSerializer(page, many=True).data)
        response.data['parent'] = ChatMessageSerializer(parent).data
        return response


class ChatTypingView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, project_id):
        serializer = ChatTypingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        room = get_chat_room(project_id, request.user, create=True)
        if serializer.validated_data['active']:
            ChatTypingState.objects.update_or_create(
                room=room, user=request.user,
                defaults={'expires_at': timezone.now() + timedelta(seconds=5)})
        else:
            ChatTypingState.objects.filter(room=room, user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChatStreamView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        room = get_chat_room(project_id, request.user, create=True)
        queryset = ProjectChatMessage.objects.filter(room=room)
        cursor = event_cursor(queryset, request.headers.get('Last-Event-ID'))
        user_id = request.user.pk
        room_id = room.pk

        def fetch(after):
            user = UserData.objects.select_related('role_link').filter(
                pk=user_id, account_status='active').first()
            if user is None or not has_permission(user, 'project', 'read') or not room.is_member(user):
                raise PermissionDenied('Chat access denied.')
            messages = list(after_cursor(
                ProjectChatMessage.objects.filter(room_id=room_id).select_related('sender'),
                after)[:50])
            return [(item.pk, item.created_at, ChatMessageSerializer(item).data)
                    for item in messages]

        def presence_fetch():
            states = (ChatTypingState.objects.filter(
                room_id=room_id, expires_at__gt=timezone.now()).exclude(user_id=user_id)
                .order_by('user_id').values('user_id', 'user__user_name'))
            return [{'user_id': item['user_id'], 'name': item['user__user_name']}
                    for item in states]

        return stream_response(fetch, cursor, 'new_message', presence_fetch)
