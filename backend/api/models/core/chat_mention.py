from django.db import models
import uuid


class ChatMention(models.Model):
    """
    Records when a user is @mentioned in a project chat message.

    Created automatically by the chat message POST handler whenever
    ``@username`` patterns are detected in the message content.
    Each mention targets exactly one user (the mentioned user).
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    message = models.ForeignKey(
        'ProjectChatMessage',
        on_delete=models.CASCADE,
        related_name='mentions',
        help_text="The chat message that contains the @mention.",
    )
    mentioned_user = models.ForeignKey(
        'UserData',
        on_delete=models.CASCADE,
        related_name='chat_mentions',
        help_text="The user who was @mentioned.",
    )
    mentioned_by = models.ForeignKey(
        'UserData',
        on_delete=models.CASCADE,
        related_name='mentions_sent',
        help_text="The user who sent the message containing the mention.",
    )
    is_read = models.BooleanField(
        default=False,
        help_text="Whether the mentioned user has seen this notification.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['mentioned_user', 'is_read']),
            models.Index(fields=['message']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return (
            f"@{self.mentioned_by.user_name} mentioned "
            f"@{self.mentioned_user.user_name} in msg {str(self.message_id)[:8]}"
        )
