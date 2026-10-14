"""
Activity feed model capturing user actions across projects and tasks.
"""

from django.db import models
import uuid


class Activity(models.Model):
    """
    Represents an event recorded in the system audit/activity timeline.

    Tracks who performed the action (`actor`), the event category (`type`),
    a human-readable message (`description`), and the associated `project` or `task`.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    actor = models.ForeignKey(
        'UserData',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activities'
    )
    type = models.CharField(max_length=50, default='')
    description = models.TextField()
    project = models.ForeignKey(
        'Project',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activities'
    )
    task = models.ForeignKey(
        'Task',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activities'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        """Format event preview string."""
        actor_name = self.actor.user_name if self.actor else "Deleted User"
        return f"{actor_name}: {self.description[:60]}"

