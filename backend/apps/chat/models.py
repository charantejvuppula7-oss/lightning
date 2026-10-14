"""Chat models. Messages remain registered by the api app."""
from api.models import ProjectChatRoom, ProjectChatMessage, ProjectChatReaction, ChatMention

from django.db import models


class ChatTypingState(models.Model):
    room = models.ForeignKey('api.ProjectChatRoom', on_delete=models.CASCADE)
    user = models.ForeignKey('api.UserData', on_delete=models.CASCADE)
    expires_at = models.DateTimeField()

    class Meta:
        constraints = [models.UniqueConstraint(fields=['room', 'user'], name='unique_chat_typing_user')]

