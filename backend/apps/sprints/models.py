import uuid
from django.db import models
from django.utils.dateparse import parse_date as parse_date_str


class Sprint(models.Model):
    """
    Represents a Sprint iteration within a project.
    Sprints help manage timelines, working days, off-days, and team assignments.
    """

    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('In Progress', 'In Progress'),
        ('Completed', 'Completed'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    project = models.ForeignKey(
        'Project',
        on_delete=models.CASCADE,
        related_name='sprints'
    )
    Sprint_No = models.CharField(max_length=20, default="")  # e.g., SP-001
    Sprint_Name = models.CharField(max_length=200, default="")  # e.g., Core Authentication
    Sprint_start_date = models.DateField()
    Sprint_end_date = models.DateField()
    Number_of_days = models.IntegerField(default=0)  # total working days
    exclude_weekends = models.BooleanField(default=True)
    Status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default='Pending'
    )
    team_members = models.ManyToManyField(
        'UserData',
        related_name='sprints',
        blank=True
    )
    points_per_working_day = models.IntegerField(default=2)
    Created_at = models.DateTimeField(auto_now_add=True)
    Updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'api'
        ordering = ['Sprint_start_date']
        indexes = [models.Index(fields=['project', 'Sprint_start_date'], name='sprint_project_start_idx')]

    def working_days(self):
        days = (self.Sprint_end_date - self.Sprint_start_date).days + 1
        if not self.exclude_weekends:
            return days
        weeks, remainder = divmod(days, 7)
        return weeks * 5 + sum((self.Sprint_start_date.weekday() + day) % 7 < 5
                               for day in range(remainder))

    def save(self, *args, **kwargs):
        self.Number_of_days = self.working_days()
        if kwargs.get('update_fields') is not None:
            kwargs['update_fields'] = set(kwargs['update_fields']) | {'Number_of_days'}
        super().save(*args, **kwargs)

        if hasattr(self, '_temp_days_not_be_consider'):
            self.days_not_be_consider = self._temp_days_not_be_consider
            delattr(self, '_temp_days_not_be_consider')

        if hasattr(self, '_temp_specific_off_days'):
            self.specific_off_days = self._temp_specific_off_days
            delattr(self, '_temp_specific_off_days')

    @property
    def days_not_be_consider(self):
        if self._state.adding:
            return getattr(self, '_temp_days_not_be_consider', [])
        return [str(d.date) for d in self.off_days.filter(is_specific=False)]

    @days_not_be_consider.setter
    def days_not_be_consider(self, value):
        if self._state.adding:
            self._temp_days_not_be_consider = value
            return
        self.off_days.filter(is_specific=False).delete()
        if not value:
            return
        from api.models import SprintOffDay
        for d_val in value:
            if not d_val:
                continue
            parsed_d = parse_date_str(str(d_val))
            if parsed_d:
                SprintOffDay.objects.get_or_create(sprint=self, date=parsed_d, is_specific=False)

    @property
    def specific_off_days(self):
        if self._state.adding:
            return getattr(self, '_temp_specific_off_days', [])
        return [{"date": str(d.date), "description": d.description} for d in self.off_days.filter(is_specific=True)]

    @specific_off_days.setter
    def specific_off_days(self, value):
        if self._state.adding:
            self._temp_specific_off_days = value
            return
        self.off_days.filter(is_specific=True).delete()
        if not value:
            return
        from api.models import SprintOffDay
        for item in value:
            if isinstance(item, dict) and 'date' in item:
                d_val = item.get('date')
                desc = item.get('description', '')
                if not d_val:
                    continue
                parsed_d = parse_date_str(str(d_val))
                if parsed_d:
                    SprintOffDay.objects.get_or_create(sprint=self, date=parsed_d, description=desc, is_specific=True)

    def __init__(self, *args, **kwargs):
        # Handle days_not_be_consider and specific_off_days kwargs
        dnbc = kwargs.pop('days_not_be_consider', None)
        sod = kwargs.pop('specific_off_days', None)
        super().__init__(*args, **kwargs)
        if dnbc is not None:
            self._temp_days_not_be_consider = dnbc
        if sod is not None:
            self._temp_specific_off_days = sod

    def __str__(self):
        return f"{self.Sprint_No} - {self.Sprint_Name or 'Unnamed Sprint'}"
