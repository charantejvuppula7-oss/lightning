from datetime import date, timedelta
from unittest.mock import patch

from django.core.management import call_command
from django.db import transaction
from django.test import TestCase
from django.utils import timezone

from api.models import Project, Role, Task, UserData
from apps.notifications.email_outbox import deliver_email, deliver_pending_emails
from apps.notifications.models import EmailOutbox
from apps.notifications.services import schedule_account_notice, schedule_assignment_notice


class EmailOutboxTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        role = Role.objects.create(name='admin')
        cls.user = UserData.objects.create(
            user_name='outbox', employee_id='OUT1', first_name='Out', last_name='Box',
            email='outbox@example.com', password='hashed',
            date_of_joining=date(2025, 1, 1), role_link=role)
        cls.project = Project.objects.create(project_name='Mail project', created_by=cls.user)

    def test_job_is_transactional_and_contains_no_password(self):
        with self.assertRaises(RuntimeError), transaction.atomic():
            schedule_account_notice(self.user, self.user)
            raise RuntimeError('roll back')
        self.assertFalse(EmailOutbox.objects.exists())

        schedule_account_notice(self.user, self.user)
        job = EmailOutbox.objects.get()
        self.assertEqual(job.kind, EmailOutbox.ACCOUNT_CREATED)
        self.assertNotIn('temporary_password', job.payload)
        self.assertTrue(job.payload['reset_password_url'].endswith('/forgot-password'))

    def test_failed_delivery_retries_and_success_is_not_repeated(self):
        task = Task.objects.create(project=self.project, assigned_to=self.user,
                                   Task_Name='Ship', description='Work')
        schedule_assignment_notice(task, self.user)
        job = EmailOutbox.objects.get()
        with patch('apps.notifications.email_outbox.EmailService.send_task_assigned_email',
                   return_value=(False, 'temporary failure')) as send:
            self.assertFalse(deliver_email(job.pk))
            self.assertFalse(deliver_email(job.pk))
        self.assertEqual(send.call_count, 1)
        job.refresh_from_db()
        self.assertEqual(job.attempts, 1)
        self.assertIsNone(job.sent_at)
        self.assertGreater(job.next_attempt_at, timezone.now())

        EmailOutbox.objects.filter(pk=job.pk).update(
            next_attempt_at=timezone.now() - timedelta(seconds=1))
        with patch('apps.notifications.email_outbox.EmailService.send_task_assigned_email',
                   return_value=(True, 'sent')) as send:
            self.assertEqual(deliver_pending_emails(), 1)
            self.assertFalse(deliver_email(job.pk))
        self.assertEqual(send.call_count, 1)
        job.refresh_from_db()
        self.assertEqual(job.attempts, 2)
        self.assertIsNotNone(job.sent_at)

    def test_expired_lease_is_recovered_by_command(self):
        task = Task.objects.create(project=self.project, assigned_to=self.user,
                                   Task_Name='Recover', description='Work')
        schedule_assignment_notice(task, self.user)
        job = EmailOutbox.objects.get()
        EmailOutbox.objects.filter(pk=job.pk).update(
            leased_until=timezone.now() - timedelta(seconds=1))
        with patch('apps.notifications.email_outbox.EmailService.send_task_assigned_email',
                   return_value=(True, 'sent')) as send:
            call_command('deliver_email_outbox', limit=1)
        send.assert_called_once()
        job.refresh_from_db()
        self.assertIsNotNone(job.sent_at)
