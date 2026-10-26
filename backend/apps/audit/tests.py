from datetime import timedelta
from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from api.models import ApiRequestLog, AuditLog


class LogRetentionTests(TestCase):
    def test_cleanup_removes_only_logs_older_than_seven_days(self):
        now = timezone.now()
        for model, timestamp, fields in [
            (AuditLog, 'timestamp', {'action': 'login', 'entity_type': 'session', 'description': 'Retention test'}),
            (ApiRequestLog, 'created_at', {'method': 'GET', 'path': '/api/test/', 'status_code': 200}),
        ]:
            records = [model.objects.create(**fields) for _ in range(3)]
            for record, age in zip(records, [timedelta(days=8), timedelta(days=7), timedelta(days=1)]):
                model.objects.filter(pk=record.pk).update(**{timestamp: now - age})

        with patch('apps.audit.management.commands.cleanup_logs.timezone.now', return_value=now):
            output = StringIO()
            call_command('cleanup_logs', stdout=output)
            self.assertIn('Deleted 1 audit log(s) and 1 API log(s)', output.getvalue())
            for model, timestamp in [(AuditLog, 'timestamp'), (ApiRequestLog, 'created_at')]:
                self.assertEqual(model.objects.count(), 2)
                self.assertFalse(model.objects.filter(**{f'{timestamp}__lt': now - timedelta(days=7)}).exists())
            call_command('cleanup_logs', stdout=StringIO())
            self.assertEqual(AuditLog.objects.count(), 2)
            self.assertEqual(ApiRequestLog.objects.count(), 2)
