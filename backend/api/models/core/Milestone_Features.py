"""
Milestone Features Model
~~~~~~~~~~~~~~~~~~~~~~~~

Defines the ``Milestone_Features`` model which represents individual
deliverable features that belong to a Milestone.

Relationships:
    - A ``Milestone`` can have **many** ``Milestone_Features`` (one-to-many
      via ForeignKey). Each feature is scoped to exactly one milestone.

Status and priority use the existing TextChoices values.
"""

from django.db import models
import uuid


class Milestone_Features(models.Model):
    """
    A single deliverable feature that belongs to a Milestone.

    Attributes:
        id (UUIDField):
            Auto-generated primary key. Never exposed as a sequential int
            so that feature IDs cannot be enumerated by external clients.

        Milestone (ForeignKey → Milestones):
            The parent milestone this feature belongs to.
            Deleting a milestone cascades and removes all its features.

        feature_name (CharField):
            Short, human-readable name of the feature (max 200 chars).

        description (TextField):
            Optional long-form description of what the feature entails,
            acceptance criteria, or any relevant notes.

        feature_status (CharField):
            Lifecycle state of the feature.  Uses the inner ``Status``
            TextChoices enum.  Defaults to ``PENDING``.

        feature_priority (CharField):
            Importance level of the feature.  Uses the inner ``Priority``
            TextChoices enum.  Defaults to ``MEDIUM``.

        feature_due_date (DateTimeField):
            Optional target completion date for this individual feature.
            May differ from the parent milestone's due date.

        created_at (DateTimeField):
            Timestamp set automatically when the record is first created.

        updated_at (DateTimeField):
            Timestamp updated automatically on every save.

    Properties:
        is_completed (bool):
            Convenience flag — ``True`` when ``feature_status == DONE``.

    Example usage::

        features = milestone.features.all()

        # Check completion
        if feature.is_completed:
            notify_stakeholders(feature)

        # Filter by status using the enum (avoids magic strings)
        pending = milestone.features.filter(
            feature_status=Milestone_Features.Status.PENDING
        )
    """

    # ── Inner enums ────────────────────────────────────────────────────

    class Status(models.TextChoices):
        """Lifecycle states a feature can be in."""
        PENDING     = 'pending',     'Pending'
        IN_PROGRESS = 'in_progress', 'In Progress'
        DONE        = 'done',        'Done'

    class Priority(models.TextChoices):
        """Importance levels for prioritising feature work."""
        LOW    = 'low',    'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH   = 'high',   'High'

    # ── Fields ─────────────────────────────────────────────────────────

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for this feature (auto-generated UUID).",
    )
    Milestone = models.ForeignKey(
        'Milestones',
        on_delete=models.CASCADE,
        related_name='features',
        db_index=True,
        help_text="The milestone this feature belongs to.",
    )
    feature_name = models.CharField(
        max_length=200,
        help_text="Short name describing the feature.",
    )
    description = models.TextField(
        null=True,
        blank=True,
        help_text="Optional detailed description, acceptance criteria, or notes.",
    )
    feature_status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
        help_text="Current lifecycle state of the feature.",
    )
    feature_priority = models.CharField(
        max_length=10,
        choices=Priority.choices,
        default=Priority.MEDIUM,
        db_index=True,
        help_text="Importance level used to prioritise feature work.",
    )
    feature_due_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Optional deadline for this feature (may differ from milestone due date).",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_completed(self) -> bool:
        """Return ``True`` when this feature is marked as done."""
        return self.feature_status == self.Status.DONE

    def __str__(self) -> str:
        return f"{self.feature_name} ({self.get_feature_status_display()}) — {self.Milestone.name}"
