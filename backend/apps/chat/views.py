from datetime import timedelta

from django.utils import timezone
from rest_framework import status, serializers
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import ProjectChatMessage, ProjectChatReaction, UserData
from apps.chat.models import ChatTypingState
from apps.chat.serializers import ChatMessageSerializer, ChatSendSerializer, ChatTypingSerializer
from apps.chat.services import get_chat_room, save_chat_message
from apps.core.pagination import ResourcePagination
from apps.core.sse import EventStreamRenderer, after_cursor, event_cursor, stream_response
from rest_framework.renderers import JSONRenderer
from apps.roles.permissions import has_permission
from django.db.models import Q, Count


class ChatHistoryView(APIView):
    """
    Endpoint providing root message history and allowing message posting within a project chat room.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        """
        List top-level chat messages in reverse chronological order with pagination.

        Args:
            request (Request): Authenticated HTTP request.
            project_id (UUID): Target project identifier.

        Returns:
            Response: Paginated chat messages.
        """
        room = get_chat_room(project_id, request.user)
        queryset = (ProjectChatMessage.objects.filter(room=room, parent_message__isnull=True)
                    if room else ProjectChatMessage.objects.none())
        search = serializers.CharField(max_length=200, allow_blank=True).run_validation(request.query_params.get('search',''))
        if search:
            queryset = queryset.filter(Q(content__icontains=search) | Q(sender__user_name__icontains=search) | Q(sender__first_name__icontains=search) | Q(sender__last_name__icontains=search))
        queryset = queryset.select_related('sender__role_link', 'attachment', 'parent_message').prefetch_related('reactions').annotate(reply_count=Count('replies')).order_by('-created_at', '-pk')
        paginator = ResourcePagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(ChatMessageSerializer(page, many=True, context={'request': request}).data)

    def post(self, request, project_id):
        """
        Send a new chat message to the project room.

        Args:
            request (Request): Payload with message content and optional client_id.
            project_id (UUID): Target project identifier.

        Returns:
            Response: Serialized created message.
        """
        serializer = ChatSendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message, created = save_chat_message(
            request.user, {**serializer.validated_data, 'project_id': project_id})
        return Response(ChatMessageSerializer(message, context={'request': request}).data,
                        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class ChatMembersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        # Authorize even when the room has no messages yet.
        room = get_chat_room(project_id, request.user)
        online = set(ChatTypingState.objects.filter(room=room, last_seen__gte=timezone.now()-timedelta(seconds=75)).values_list('user_id',flat=True))
        users = UserData.objects.filter(account_status='active').filter(
            Q(assigned_projects__pk=project_id) | Q(managed_projects__pk=project_id) |
            Q(default_projects__pk=project_id) | Q(projects__pk=project_id)).select_related('role_link').distinct()
        return Response([{'id': user.pk, 'user_name': user.user_name,
            'name': f'{user.first_name} {user.last_name}'.strip(), 'designation': user.designation, 'role':user.role, 'online':user.pk in online}
            for user in users])


class ChatThreadView(APIView):
    """
    Endpoint for viewing a specific threaded discussion under a parent message.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id, message_id):
        """
        Retrieve parent message and chronological list of reply messages.

        Args:
            request (Request): Authenticated HTTP request.
            project_id (UUID): Project identifier.
            message_id (UUID): Parent message identifier.

        Returns:
            Response: Paginated replies along with serialized parent message.

        Raises:
            NotFound: If the parent message does not exist in the project room.
        """
        room = get_chat_room(project_id, request.user)
        parent = ProjectChatMessage.objects.filter(
            pk=message_id, room=room, parent_message__isnull=True).select_related('sender').first()
        if parent is None:
            raise NotFound('Message not found.')
        replies = ProjectChatMessage.objects.filter(parent_message=parent).select_related(
            'sender__role_link', 'attachment').prefetch_related('reactions').annotate(reply_count=Count('replies')).order_by('created_at', 'pk')
        paginator = ResourcePagination()
        page = paginator.paginate_queryset(replies, request, view=self)
        response = paginator.get_paginated_response(ChatMessageSerializer(page, many=True, context={'request': request}).data)
        response.data['parent'] = ChatMessageSerializer(parent).data
        return response


class ChatTypingView(APIView):
    """
    Endpoint broadcasting user typing presence status into the project chat room.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, project_id):
        """
        Update or clear the active typing indicator for the requesting user.

        Args:
            request (Request): Payload with {'active': boolean}.
            project_id (UUID): Target project identifier.

        Returns:
            Response: HTTP 204 No Content.
        """
        serializer = ChatTypingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        room = get_chat_room(project_id, request.user, create=True)
        if serializer.validated_data['active']:
            ChatTypingState.objects.update_or_create(
                room=room, user=request.user,
                defaults={'expires_at': timezone.now() + timedelta(seconds=5)})
        else:
            ChatTypingState.objects.filter(room=room, user=request.user).update(expires_at=timezone.now())
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChatStreamView(APIView):
    """
    ASGI Server-Sent Events (SSE) stream broadcasting real-time chat messages and typing presence.
    """
    permission_classes = [IsAuthenticated]
    renderer_classes = [EventStreamRenderer, JSONRenderer]

    def get(self, request, project_id):
        """
        Establish a persistent SSE stream yielding 'new_message' and 'typing_changed' events.

        Args:
            request (Request): Authenticated HTTP request with optional Last-Event-ID header.
            project_id (UUID): Target project identifier.

        Returns:
            StreamingHttpResponse: Persistent SSE connection.
        """
        room = get_chat_room(project_id, request.user, create=True)
        queryset = ProjectChatMessage.objects.filter(room=room)
        cursor = event_cursor(queryset, request.headers.get('Last-Event-ID'))
        user_id = request.user.pk
        room_id = room.pk

        def fetch(after):
            """Fetch newly arrived chat messages after the active cursor position."""
            user = UserData.objects.select_related('role_link').filter(
                pk=user_id, account_status='active').first()
            if user is None or not has_permission(user, 'Chat', 'View') or not room.is_member(user):
                raise PermissionDenied('Chat access denied.')
            messages = list(after_cursor(
                ProjectChatMessage.objects.filter(room_id=room_id).select_related('sender__role_link', 'attachment').prefetch_related('reactions').annotate(reply_count=Count('replies')),
                after)[:50])
            return [(item.pk, item.created_at, ChatMessageSerializer(item).data)
                    for item in messages]

        reaction_revision = None
        reaction_snapshot = []

        def presence_fetch():
            """Fetch current active typing indicator states excluding the current user."""
            now = timezone.now()
            online_since = now - timedelta(seconds=75)
            states = list(ChatTypingState.objects.filter(room_id=room_id).filter(
                Q(expires_at__gt=now) | Q(last_seen__gte=online_since)
            ).order_by('user_id').values('user_id', 'user__user_name', 'expires_at', 'last_seen'))
            nonlocal reaction_revision, reaction_snapshot
            revision = type(room).objects.filter(pk=room_id).values_list('updated_at',flat=True).first()
            if reaction_revision != revision:
                reactions = ProjectChatReaction.objects.filter(message__room_id=room_id).values('message_id').annotate(count=Count('id'))
                own = set(ProjectChatReaction.objects.filter(message__room_id=room_id,user_id=user_id).values_list('message_id',flat=True))
                reaction_snapshot = [{**item,'reacted':item['message_id'] in own} for item in reactions]
                reaction_revision = revision
            online = [item['user_id'] for item in states if item['last_seen'] >= online_since]
            return {'users':[{'user_id':item['user_id'],'name':item['user__user_name']} for item in states
                             if item['user_id'] != user_id and item['expires_at'] > now],
                'online_ids':online, 'reactions':reaction_snapshot}


        return stream_response(fetch, cursor, 'new_message', presence_fetch)



class ChatReactionView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, project_id, message_id):
        return self.update(request, project_id, message_id, add=True)

    def delete(self, request, project_id, message_id):
        return self.update(request, project_id, message_id, add=False)

    def update(self, request, project_id, message_id, *, add):
        room = get_chat_room(project_id, request.user)
        message = ProjectChatMessage.objects.filter(pk=message_id, room=room).first()
        if message is None:
            raise NotFound('Message not found.')
        if add:
            ProjectChatReaction.objects.get_or_create(message=message, user=request.user)
        else:
            ProjectChatReaction.objects.filter(message=message, user=request.user).delete()
        type(room).objects.filter(pk=room.pk).update(updated_at=timezone.now())
        return Response({'count': message.reactions.count(), 'reacted': add})


class ChatPresenceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, project_id):
        room = get_chat_room(project_id, request.user, create=True)
        state, _ = ChatTypingState.objects.get_or_create(room=room,user=request.user,
            defaults={'expires_at':timezone.now()})
        ChatTypingState.objects.filter(pk=state.pk).update(last_seen=timezone.now())
        return Response(status=204)

    def delete(self, request, project_id):
        room = get_chat_room(project_id, request.user)
        ChatTypingState.objects.filter(room=room,user=request.user).delete()
        return Response(status=204)
