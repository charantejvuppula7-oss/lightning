import uuid
from django.db import models


class TaskDependency(models.Model):
    """
    Represents a single dependency for a Task.

    A task may have zero or many dependency rows, each capturing:
        - What the dependency is (description)
        - Which team member owns / is responsible for it (assigned_to)
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    DEPENDENCY_TYPE_CHOICES = [
        ('mandatory', 'Mandatory dependency'),
        ('optional', 'Optional dependency'),
    ]
    task = models.ForeignKey(
        'Task',
        on_delete=models.CASCADE,
        related_name='dependencies',
    )
    depends_on = models.ForeignKey(
        'Task', on_delete=models.CASCADE, null=True, blank=True,
        related_name='blocking_dependencies',
    )
    description = models.TextField(
        help_text="What this dependency entails.",
    )
    dependency_type = models.CharField(
        max_length=20,
        choices=DEPENDENCY_TYPE_CHOICES,
        default='optional',
        db_default='optional',
    )
    assigned_to = models.ForeignKey(
        'UserData',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='dependency_assignments',
        help_text="Team member responsible for this dependency.",
    )
    due_date = models.DateField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Optional due date for this dependency.",
    )
    status = models.CharField(
        max_length=30,
        choices=[
            ('started', 'Started'),
            ('in_progress', 'In Progress'),
            ('paused', 'Paused'),
            ('in_review', 'In Review'),
            ('completed', 'Completed'),
        ],
        default='started',
        help_text="Status of the dependency",
    )
    review_by = models.ForeignKey('api.UserData', on_delete=models.SET_NULL, null=True, blank=True, related_name='dependency_reviews')
    submission = models.JSONField(default=dict, blank=True)
    Time_Taken = models.DurationField(null=True, blank=True)
    start_Time = models.DateTimeField(null=True, blank=True)
    pause_Time = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'api'
        constraints = [
            models.UniqueConstraint(fields=['task', 'depends_on'], name='unique_task_dependency'),
            models.CheckConstraint(condition=~models.Q(task=models.F('depends_on')),
                                   name='dependency_not_self'),
        ]
        ordering = ['created_at']

    def clean(self):
        from django.core.exceptions import ValidationError
        from django.db.models import Q
        from api.models import UserData

        if not self.task_id:
            return
        project = self.task.project
        errors = {}
        if self.depends_on_id:
            if self.depends_on_id == self.task_id:
                errors['depends_on'] = 'A task cannot depend on itself.'
            elif self.depends_on.project_id != project.pk:
                errors['depends_on'] = 'Dependency task belongs to a different project.'
            elif TaskDependency.objects.filter(task_id=self.task_id, depends_on_id=self.depends_on_id).exclude(pk=self.pk).exists():
                errors['depends_on'] = 'Duplicate task dependency.'
            else:
                edges = {}
                for source, target in TaskDependency.objects.filter(
                    task__project=project, depends_on__isnull=False
                ).exclude(pk=self.pk).values_list('task_id', 'depends_on_id'):
                    edges.setdefault(source, set()).add(target)
                pending = [self.depends_on_id]
                visited = set()
                while pending:
                    current = pending.pop()
                    if current == self.task_id:
                        errors['depends_on'] = 'Circular task dependency.'
                        break
                    if current not in visited:
                        visited.add(current)
                        pending.extend(edges.get(current, ()))
        if self.review_by_id:
            reviewer = UserData.objects.filter(pk=self.review_by_id, account_status='active').first()
            if reviewer is None or not (reviewer.pk == project.created_by_id or project.project_managers.filter(pk=reviewer.pk).exists() or project.team_members.filter(pk=reviewer.pk).exists() or project.members.filter(pk=reviewer.pk).exists()):
                errors['review_by'] = 'Reviewer must be an active project member.'
        if self.assigned_to_id:
            is_member = UserData.objects.filter(pk=self.assigned_to_id, account_status='active').filter(
                Q(pk=project.created_by_id) | Q(assigned_projects=project) |
                Q(managed_projects=project) | Q(default_projects=project)
            ).exists()
            if not is_member:
                errors['assigned_to'] = 'Assignee must be an active project member.'
        if errors:
            raise ValidationError(errors)

    def __str__(self):
        assignee = self.assigned_to.user_name if self.assigned_to_id else 'unassigned'
        return f"Dep for Task {str(self.task_id)[:8]} → {assignee}: {self.description[:40]}"
