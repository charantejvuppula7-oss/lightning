from django.db import models
import uuid

class Activity(models.Model):
    """
    Represents a single event in the activity feed.
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
        actor_name = self.actor.user_name if self.actor else "Deleted User"
        return f"{actor_name}: {self.description[:60]}"
