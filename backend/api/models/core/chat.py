import uuid
from django.db import models
from django.core.exceptions import ValidationError


class ProjectChatRoom(models.Model):
    """
    Represents a dedicated chat room for a Project.
    Guarantees 1-to-1 project binding and prevents non-project chats.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    project = models.OneToOneField(
        'Project',
        on_delete=models.CASCADE,
        related_name='chat_room'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def is_member(self, user):
        """
        Active admins can chat in any project; other roles need assignment.
        """
        if not user or getattr(user, 'account_status', 'active') != 'active':
            return False
        from apps.roles.permissions import is_admin
        if is_admin(user):
            return True
        user_id = getattr(user, 'id', user)
        if self.project.created_by_id == user_id:
            return True
        if self.project.project_managers.filter(id=user_id).exists():
            return True
        return (self.project.team_members.filter(id=user_id).exists() or
                self.project.members.filter(id=user_id).exists())

    def __str__(self):
        return f"ChatRoom({self.project.project_name})"


class ProjectChatMessage(models.Model):
    """
    Represents a single message posted within a ProjectChatRoom.
    Access and posting are strictly limited to project team members.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    room = models.ForeignKey(
        'ProjectChatRoom',
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.ForeignKey(
        'UserData',
        on_delete=models.CASCADE,
        related_name='sent_project_messages'
    )
    content = models.TextField(blank=True)
    client_id = models.CharField(max_length=100, null=True, blank=True)
    attachment = models.ForeignKey(
        'ResourceFile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='chat_attachments'
    )
    parent_message = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='replies'
    )
    is_edited = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


    class Meta:
        ordering = ['created_at']
        constraints = [models.UniqueConstraint(
            fields=['room', 'sender', 'client_id'],
            condition=models.Q(client_id__isnull=False),
            name='unique_chat_client_message',
        )]
        indexes = [
            models.Index(fields=['room', 'parent_message', 'created_at']),
            models.Index(fields=['parent_message', 'created_at']),
            models.Index(fields=['room', 'created_at']),
        ]

    def clean(self):
        super().clean()
        if self.parent_message_id and self.parent_message.room_id != self.room_id:
            raise ValidationError({'parent_message': 'Parent message must belong to this chat room.'})
        if self.parent_message_id and self.parent_message.parent_message_id:
            raise ValidationError({'parent_message': 'Replies can only be added to top-level messages.'})
        if hasattr(self, 'room') and hasattr(self, 'sender') and self.room_id and self.sender_id:
            if not self.room.is_member(self.sender):
                raise ValidationError(
                    f"User '{self.sender.user_name}' is not a team member of project '{self.room.project.project_name}'."
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"[{self.room.project.project_name}] {self.sender.user_name}: {self.content[:40]}"


class ProjectChatReaction(models.Model):
    """
    Emoji or status reaction attached to a specific chat message by a user.
    """
    message = models.ForeignKey(ProjectChatMessage, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey('UserData', on_delete=models.CASCADE)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['message', 'user'], name='unique_chat_reaction')]

    def __str__(self):
        """String representation of reaction."""
        return f"Reaction by {self.user.user_name} on {self.message_id}"

