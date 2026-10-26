from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from api.models import ApiRequestLog, AuditLog


class Command(BaseCommand):
    help = 'Delete audit and API request logs older than seven days.'

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=7)
        with transaction.atomic():
            audit_count, _ = AuditLog.objects.filter(timestamp__lt=cutoff).delete()
            api_count, _ = ApiRequestLog.objects.filter(created_at__lt=cutoff).delete()
        self.stdout.write(
            f'Deleted {audit_count} audit log(s) and {api_count} API log(s) older than {cutoff.isoformat()}.'
        )
