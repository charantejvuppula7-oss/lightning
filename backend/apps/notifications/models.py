import uuid

from django.db import models
from django.utils import timezone


class Notification(models.Model):
    TASK_ASSIGNED = 'task_assigned'
    TASK_DUE_TODAY = 'task_due_today'
    TASK_OVERDUE = 'task_overdue'
    DEPENDENCY_DUE_TODAY = 'dependency_due_today'
    DEPENDENCY_OVERDUE = 'dependency_overdue'
    DEPENDENCY_NUDGE = 'dependency_nudge'
    CHAT_MENTION = 'chat_mention'
    TYPES = [
        (TASK_ASSIGNED, 'Task assigned'),
        (TASK_DUE_TODAY, 'Task due today'),
        (TASK_OVERDUE, 'Task overdue'),
        (DEPENDENCY_DUE_TODAY, 'Dependency due today'),
        (DEPENDENCY_OVERDUE, 'Dependency overdue'),
        (CHAT_MENTION, 'Chat mention'),
        (DEPENDENCY_NUDGE, 'Dependency nudge'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('api.UserData', on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=30, choices=TYPES)
    resource_id = models.UUIDField()
    title = models.CharField(max_length=100)
    message = models.CharField(max_length=300)
    notification_date = models.DateField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(
            fields=['user', 'notification_type', 'resource_id', 'notification_date'],
            name='unique_deadline_notification_per_day',
            condition=~models.Q(notification_type='dependency_nudge'),
        )]
        indexes = [models.Index(fields=['user', 'is_read', '-created_at'],
                                name='notification_user_unread_idx')]
        ordering = ['-created_at', '-id']


class EmailOutbox(models.Model):
    ACCOUNT_CREATED = 'account_created'
    TASK_ASSIGNED = 'task_assigned'
    CHAT_MENTION = 'chat_mention'
    KINDS = [(ACCOUNT_CREATED, 'Account created'), (TASK_ASSIGNED, 'Task assigned'), (CHAT_MENTION, 'Chat mention')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kind = models.CharField(max_length=30, choices=KINDS)
    payload = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    next_attempt_at = models.DateTimeField(default=timezone.now)
    leased_until = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    attempts = models.PositiveIntegerField(default=0)
    last_error = models.CharField(max_length=300, blank=True, default='')

    class Meta:
        indexes = [models.Index(fields=['sent_at', 'next_attempt_at', 'leased_until'],
                                name='email_outbox_pending_idx')]
