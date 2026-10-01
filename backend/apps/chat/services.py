import re

from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError as ModelValidationError
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from api.models import ChatMention, Project, ProjectChatMessage, ProjectChatRoom, UserData
from apps.notifications.models import Notification
from apps.roles.permissions import require_permission


def get_chat_room(project_id, user, *, create=False):
    require_permission(user, 'project', 'read')
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
    room = get_chat_room(data['project_id'], user, create=True)
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
                defaults={'content': data['content'], 'parent_message': parent},
            )
        except ModelValidationError:
            message = ProjectChatMessage.objects.filter(
                room=room, sender=user, client_id=client_id).first()
            if message is None:
                raise
            created = False
    else:
        message = ProjectChatMessage.objects.create(room=room, sender=user,
                                                    content=data['content'], parent_message=parent)
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
    return message, created
