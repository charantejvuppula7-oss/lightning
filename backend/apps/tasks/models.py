import json
import uuid
from django.db import models
from django.core.exceptions import ValidationError
from django.db.models import Q


class Task(models.Model):
    """
    Represents a task assigned to a user within a project.
    """

    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('in_review', 'In Review'),
        ('completed', 'Completed'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    Task_Name = models.CharField(max_length=100, default="")
    project = models.ForeignKey(
        'Project',
        on_delete=models.CASCADE,
        related_name='tasks'
    )
    assigned_to = models.ForeignKey(
        'UserData',
        on_delete=models.CASCADE,
        related_name='tasks'
    )
    description = models.TextField()
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default='open'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    Remarks = models.TextField(null=True, blank=True)
    Time_Taken = models.DurationField(null=True, blank=True)
    Due_Date = models.DateField(null=True, blank=True, db_index=True)
    planned_start_date = models.DateField(null=True, blank=True)
    start_Time = models.DateTimeField(null=True, blank=True)
    pause_Time = models.DateTimeField(null=True, blank=True)
    review_by = models.ForeignKey(
        'UserData',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='review'
    )
    sprint = models.ForeignKey(
        'Sprint',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks'
    )
    feature = models.ForeignKey(
        'Milestone_Features',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks'
    )

    class Meta:
        app_label = 'api'
        indexes = [
            models.Index(fields=['assigned_to', 'project']),
            models.Index(fields=['project', 'status']),
        ]

    STATUS_TRANSITIONS = {
        'open': {'in_progress'},
        'in_progress': {'in_review'},
        'in_review': {'completed', 'in_progress'},
        'completed': set(),
    }

    def transition_to(self, new_status, *, save=True):
        if new_status != self.status and new_status not in self.STATUS_TRANSITIONS.get(self.status, set()):
            raise ValidationError({'status': 'Invalid task status transition.'})
        self.status = new_status
        if save:
            self.save(update_fields=['status', 'updated_at'])

    def clean(self):
        if self._state.adding and self.status != 'open':
            raise ValidationError({'status': 'New tasks must be open.'})
        if not self.project_id or not self.assigned_to_id:
            return
        from api.models import UserData
        candidates = [self.assigned_to_id]
        if self.review_by_id:
            candidates.append(self.review_by_id)
        members = set(UserData.objects.filter(pk__in=candidates).filter(
            Q(pk=self.project.created_by_id) | Q(assigned_projects=self.project_id) |
            Q(managed_projects=self.project_id) | Q(default_projects=self.project_id)
        ).values_list('pk', flat=True))
        errors = {}
        if self.assigned_to_id not in members or self.assigned_to.account_status != 'active':
            errors['assigned_to'] = 'User is not an active project member.'
        if self.review_by_id and self.review_by_id not in members:
            errors['review_by'] = 'Reviewer is not a project member.'
        if self.sprint_id and self.sprint.project_id != self.project_id:
            errors['sprint'] = 'Sprint belongs to a different project.'
        if self.feature_id and self.feature.Milestone.project_id != self.project_id:
            errors['feature'] = 'Feature belongs to a different project.'
        if errors:
            raise ValidationError(errors)

    def validate_deletion(self):
        if self.milestones_set.exists():
            raise ValidationError({'detail': 'Task has dependent milestones.'})

    @property
    def priority(self):
        if getattr(self, 'Remarks', None):
            try:
                meta = json.loads(self.Remarks)
                if isinstance(meta, dict) and meta.get('priority'):
                    return meta.get('priority')
            except json.JSONDecodeError:
                pass
        return "medium"

    def __str__(self):
        short_desc = self.description[:50] + ('...' if len(self.description) > 50 else '')
        return f"Task {str(self.id)[:8]} — {short_desc}"
