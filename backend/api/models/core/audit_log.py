"""
Audit Log Model
~~~~~~~~~~~~~~~~

Stores a record of user actions retained for seven days.
Every create, update, delete, status change, login, and logout is captured
here with full hierarchical context.

Expired records are removed by the scheduled cleanup_logs command.
"""

from django.db import models
import uuid


class AuditLog(models.Model):
    """
    Represents a single audited user action.

    Each row captures who did what, to which entity, with full context
    (project → milestone → feature → task), at an exact timestamp.

    Example description:
        "hanuman completed task26 of feature 1/milestone2/project lightning"
    """

    ACTION_CHOICES = [
        ('login', 'Login'),
        ('login_failed', 'Failed Login Attempt'),
        ('logout', 'Logout'),
        ('created', 'Created'),
        ('updated', 'Updated'),
        ('deleted', 'Deleted'),
        ('completed', 'Completed'),
        ('status_changed', 'Status Changed'),
        ('uploaded', 'Uploaded'),
        ('downloaded', 'Downloaded'),
        ('assigned', 'Assigned'),
        ('reassigned', 'Reassigned'),
        ('reordered', 'Reordered'),
        ('access_denied', 'Access Denied'),
        ('timer_paused', 'Timer Paused'),
        ('timer_resumed', 'Timer Resumed'),
    ]

    ENTITY_TYPE_CHOICES = [
        ('project', 'Project'),
        ('task', 'Task'),
        ('sprint', 'Sprint'),
        ('milestone', 'Milestone'),
        ('feature', 'Feature'),
        ('resource_file', 'Resource File'),
        ('user_account', 'User Account'),
        ('role', 'Role'),
        ('dependency', 'Dependency'),
        ('session', 'Session'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    user = models.ForeignKey(
        'UserData',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        help_text='The user who performed the action.',
    )
    session_key = models.CharField(
        max_length=40,
        null=True,
        blank=True,
        db_index=True,
        help_text='Session key grouping all actions in a single session.',
    )
    request_path = models.CharField(
        max_length=512,
        blank=True,
        default='',
        help_text='API endpoint URL path.',
    )
    action = models.CharField(
        max_length=30,
        choices=ACTION_CHOICES,
        db_index=True,
        help_text='The type of action performed.',
    )
    entity_type = models.CharField(
        max_length=30,
        choices=ENTITY_TYPE_CHOICES,
        db_index=True,
        help_text='The type of entity acted upon.',
    )
    entity_id = models.UUIDField(
        null=True,
        blank=True,
        help_text='Primary key of the affected entity.',
    )
    entity_name = models.CharField(
        max_length=300,
        blank=True,
        default='',
        help_text='Human-readable name of the entity (e.g., task name, project name).',
    )
    description = models.TextField(
        help_text='Full human-readable audit sentence.',
    )
    context = models.JSONField(
        default=dict,
        blank=True,
        help_text='Hierarchical context: project, milestone, feature, sprint info.',
    )
    old_values = models.JSONField(
        null=True,
        blank=True,
        help_text='Previous field values (for updates).',
    )
    new_values = models.JSONField(
        null=True,
        blank=True,
        help_text='New field values (for updates).',
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
    )
    user_agent = models.TextField(
        blank=True,
        default='',
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp', 'action']),
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['entity_type', 'entity_id']),
        ]
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'

    def __str__(self):
        user_name = self.user.user_name if self.user else 'System'
        return f"[{self.timestamp:%H:%M:%S %d/%m/%y}] {user_name} {self.action} {self.entity_type}"
