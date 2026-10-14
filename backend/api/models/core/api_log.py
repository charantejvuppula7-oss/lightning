"""
API Request Log Model
~~~~~~~~~~~~~~~~~~~~~

Stores a record of every incoming API request for audit and
performance-monitoring purposes.
"""

from django.db import models
import uuid


class ApiRequestLog(models.Model):
    """
    Represents a single logged API request.
    """

    METHOD_CHOICES = [
        ('GET', 'GET'),
        ('POST', 'POST'),
        ('PUT', 'PUT'),
        ('PATCH', 'PATCH'),
        ('DELETE', 'DELETE'),
        ('OPTIONS', 'OPTIONS'),
        ('HEAD', 'HEAD'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    request_id = models.UUIDField(null=True, blank=True, db_index=True)
    user = models.ForeignKey(
        'UserData',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='api_logs',
        help_text='Authenticated user who made the request (null for anonymous).',
    )
    method = models.CharField(
        max_length=10,
        choices=METHOD_CHOICES,
        db_index=True,
    )
    path = models.CharField(
        max_length=512,
        db_index=True,
        help_text='Request path, e.g. /api/user/session/',
    )
    status_code = models.PositiveSmallIntegerField(
        db_index=True,
        help_text='HTTP response status code.',
    )
    response_time_ms = models.FloatField(
        default=0,
        help_text='Time taken to process the request, in milliseconds.',
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
    )
    user_agent = models.TextField(
        blank=True,
        default='',
    )
    query_params = models.TextField(
        blank=True,
        default='',
        help_text='Raw query string from the request URL.',
    )
    request_body_size = models.PositiveIntegerField(
        default=0,
        help_text='Size of the request body in bytes.',
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at', 'status_code']),
            models.Index(fields=['method', '-created_at']),
        ]
        verbose_name = 'API Request Log'
        verbose_name_plural = 'API Request Logs'

    def __str__(self):
        user_name = self.user.user_name if self.user else 'Anonymous'
        return f"[{self.method}] {self.path} → {self.status_code} ({user_name})"
