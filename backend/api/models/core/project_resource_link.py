from django.db import models
import uuid

class ProjectResourceLink(models.Model):
    """
    Project Resource Link model.
    Replaces the unstructured resource_links JSONField.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    project = models.ForeignKey(
        'Project',
        on_delete=models.CASCADE,
        related_name='links'
    )
    url = models.URLField(max_length=500)
    label = models.CharField(max_length=200, blank=True, default='')

    def __str__(self):
        return f"{self.label or self.url} ({self.project.project_name})"
