import re
from types import SimpleNamespace

from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError as ModelValidationError
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from api.models import ChatMention, Project, ProjectChatMessage, ProjectChatRoom, ProjectChatReaction, UserData, ResourceFile
from apps.chat.serializers import ChatMessageSerializer
from apps.notifications.models import Notification, EmailOutbox
from apps.notifications.email_outbox import enqueue_emails
from apps.roles.permissions import require_permission


def get_chat_room(project_id, user, *, create=False):
    """
    Retrieve or initialize the ProjectChatRoom associated with a project.

    Verifies an active account and project room membership.

    Args:
        project_id (UUID): Target project identifier.
        user (UserData): Acting user.
        create (bool): If True, creates the chat room if it does not yet exist.

    Returns:
        ProjectChatRoom|None: The resolved chat room instance.

    Raises:
        NotFound: If project does not exist.
        PermissionDenied: If user is not an authorized member of the project.
    """
    require_permission(user, 'Chat', 'View')
    project = Project.objects.filter(pk=project_id).first()
    if project is None:
        raise NotFound('Project not found.')
    candidate = ProjectChatRoom(project=project)
    if not candidate.is_member(user):
        raise PermissionDenied('Chat access denied.')
    if create:
        room, _ = ProjectChatRoom.objects.get_or_create(project=project)
        return room
    return ProjectChatRoom.objects.filter(project=project).first()


@transaction.atomic
def save_chat_message(user, data):
    """
    Persist a new chat message, parse @username mentions, and generate in-app notifications.

    Supports idempotent message delivery using `client_id` (UUID) deduplication.
    Mentions are parsed using regex, verified against project membership, and dispatched
    as in-app notifications.

    Args:
        user (UserData): Message author.
        data (dict): Message parameters including 'project_id', 'content', optional 'client_id' and 'parent_message_id'.

    Returns:
        tuple[ProjectChatMessage, bool]: (message_instance, was_created_boolean).

    Raises:
        ValidationError: If parent message is invalid or outside the project room.
    """
    room = get_chat_room(data['project_id'], user, create=True)
    attachment = None
    if data.get('attachment_id'):
        require_permission(user, 'Documents', 'View')
        attachment = ResourceFile.objects.filter(pk=data['attachment_id'], project_id=data['project_id']).first()
        if attachment is None:
            raise ValidationError({'attachment_id': 'Attachment is not in this project.'})
    parent = None
    if data.get('parent_message_id'):
        parent = ProjectChatMessage.objects.filter(
            pk=data['parent_message_id'], room=room, parent_message__isnull=True).first()
        if parent is None:
            raise ValidationError({'parent_message_id': 'Parent message not found in this project.'})
    client_id = data.get('client_id')
    if client_id:
        try:
            message, created = ProjectChatMessage.objects.get_or_create(
                room=room, sender=user, client_id=client_id,
                defaults={'content': data['content'], 'parent_message': parent, 'attachment': attachment},
            )
        except ModelValidationError:
            message = ProjectChatMessage.objects.filter(
                room=room, sender=user, client_id=client_id).first()
            if message is None:
                raise
            created = False
    else:
        message = ProjectChatMessage.objects.create(room=room, sender=user,
                                                    content=data['content'], parent_message=parent, attachment=attachment)
        created = True
    if created:
        names = set(re.findall(r'(?<!\w)@([A-Za-z0-9_.-]+)', message.content))
        recipients = UserData.objects.filter(user_name__in=names).exclude(pk=user.pk)
        recipients = [recipient for recipient in recipients if room.is_member(recipient)]
        ChatMention.objects.bulk_create([
            ChatMention(message=message, mentioned_user=recipient, mentioned_by=user)
            for recipient in recipients
        ])
        Notification.objects.bulk_create([
            Notification(
                user=recipient, notification_type=Notification.CHAT_MENTION,
                resource_id=message.pk, notification_date=timezone.localdate(),
                title=f'{user.user_name} mentioned you'[:100],
                message=f'{user.user_name} mentioned you: "{message.content[:230]}"'[:300],
            ) for recipient in recipients
        ], ignore_conflicts=True)
        enqueue_emails([(EmailOutbox.CHAT_MENTION, {
            'to_email': recipient.email,
            'sender_name': f'{user.first_name} {user.last_name}'.strip() or user.user_name,
            'project_name': room.project.project_name, 'message': message.content,
            'message_id': str(message.pk), 'mentioned_usernames': sorted(names),
        }) for recipient in recipients if recipient.email])
        transaction.on_commit(lambda: publish_message(message))
    return message, created


def message_data(message, user=None):
    return dict(ChatMessageSerializer(message, context={'request': SimpleNamespace(user=user)} if user else {}).data)


def publish_message(message):
    from apps.chat.socket import broadcast, schedule
    data = {'message': message_data(message)}
    if message.parent_message_id:
        data['parent'] = message_data(message.parent_message)
    schedule(lambda: broadcast('message_created', message.room.project_id, data))


@transaction.atomic
def change_message(user, room, message_id, *, content=None, delete=False):
    from apps.chat.socket import broadcast, schedule
    message = ProjectChatMessage.objects.select_for_update().filter(pk=message_id, room=room).first()
    if message is None:
        raise NotFound('Message not found.')
    if message.sender_id != user.pk:
        raise PermissionDenied('You can only edit or delete your own messages.')
    if delete:
        data = {'message_id': str(message.pk), 'parent_id': str(message.parent_message_id) if message.parent_message_id else None}
        parent = message.parent_message
        message.delete()
        if parent:
            data['parent'] = message_data(parent)
        event = 'message_deleted'
    else:
        if not isinstance(content, str) or len(content) > 10000 or (not content.strip() and not message.attachment_id):
            raise ValidationError('Enter a message of up to 10000 characters.')
        message.content = content.strip()
        message.is_edited = True
        message.save(update_fields=['content', 'is_edited', 'updated_at'])
        data = {'message': message_data(message)}
        event = 'message_updated'
    transaction.on_commit(lambda: schedule(lambda: broadcast(event, room.project_id, data)))
    return data


@transaction.atomic
def change_reaction(user, room, message_id, *, add):
    from apps.chat.socket import broadcast, schedule
    message = ProjectChatMessage.objects.filter(pk=message_id, room=room).first()
    if message is None:
        raise NotFound('Message not found.')
    if add:
        ProjectChatReaction.objects.get_or_create(message=message, user=user)
    else:
        ProjectChatReaction.objects.filter(message=message, user=user).delete()
    user_ids = [str(pk) for pk in message.reactions.values_list('user_id', flat=True)]
    data = {'message_id': str(message.pk), 'user_ids': user_ids}
    transaction.on_commit(lambda: schedule(lambda: broadcast('reaction_changed', room.project_id, data)))
    return {'count': len(user_ids), 'reacted': add}

