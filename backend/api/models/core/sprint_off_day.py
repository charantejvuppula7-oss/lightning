from django.db import models
import uuid

class SprintOffDay(models.Model):
    """
    Represents an off-day associated with a Sprint.
    Maps public holidays, company off-days, and custom non-working days.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    sprint = models.ForeignKey(
        'Sprint',
        on_delete=models.CASCADE,
        related_name='off_days'
    )
    date = models.DateField()
    description = models.CharField(
        max_length=200,
        blank=True,
        default=''
    )
    is_specific = models.BooleanField(
        default=False,
        help_text="True if this is from specific_off_days (includes desc), False if from days_not_be_consider."
    )

    class Meta:
        ordering = ['date']
        unique_together = ('sprint', 'date', 'is_specific')

    def __str__(self):
        desc = f" ({self.description})" if self.description else ""
        return f"{self.sprint.Sprint_No} off-day on {self.date}{desc}"
