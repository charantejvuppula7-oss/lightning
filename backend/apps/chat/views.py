
from rest_framework import status, serializers
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import ProjectChatMessage, UserData
from apps.chat.serializers import ChatMessageSerializer, ChatSendSerializer
from apps.chat.services import get_chat_room, save_chat_message, change_reaction
from apps.core.pagination import ResourcePagination
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
        response = paginator.get_paginated_response(ChatMessageSerializer(page, many=True, context={'request': request}).data)
        if request.query_params.get('messageId'):
            message_id = serializers.UUIDField().run_validation(request.query_params['messageId'])
            message = ProjectChatMessage.objects.filter(pk=message_id, room=room).select_related('parent_message').first()
            if message is None:
                raise NotFound('Message not found.')
            response.data['focus'] = ChatMessageSerializer(message.parent_message or message, context={'request': request}).data
        return response

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
        users = UserData.objects.filter(account_status='active').filter(
            Q(assigned_projects__pk=project_id) | Q(managed_projects__pk=project_id) |
            Q(default_projects__pk=project_id) | Q(projects__pk=project_id)).select_related('role_link').distinct()
        return Response([{'id': user.pk, 'user_name': user.user_name,
            'name': f'{user.first_name} {user.last_name}'.strip(), 'designation': user.designation, 'role':user.role, 'online':False}
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


class ChatReactionView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, project_id, message_id):
        return self.update(request, project_id, message_id, add=True)

    def delete(self, request, project_id, message_id):
        return self.update(request, project_id, message_id, add=False)

    def update(self, request, project_id, message_id, *, add):
        room = get_chat_room(project_id, request.user)
        return Response(change_reaction(request.user, room, message_id, add=add))
