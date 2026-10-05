"""
Management command to evaluate tasks and dependencies and generate daily due/overdue alerts.
"""

import logging

from django.core.management.base import BaseCommand

from apps.notifications.services import generate_due_notifications


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """
    Django management command: `python manage.py generate_due_notifications`.

    Designed to be run as an automated daily scheduled task (e.g. systemd timer, cron, or Celery beat).
    Identifies all tasks and dependencies due today or overdue and inserts deduplicated in-app
    notification records for assignees.
    """
    help = 'Create in-app notifications for due and overdue tasks and dependencies.'

    def handle(self, *args, **options):
        """
        Execute deadline evaluation service and log outcome.

        Args:
            *args: Variable positional arguments.
            **options: Parsed command-line options.

        Raises:
            Exception: Re-raises any unhandled error after writing to error logs.
        """
        try:
            considered = generate_due_notifications()
        except Exception:
            logger.exception('notification_deadline_check_failed')
            raise
        self.stdout.write(f'Deadline check complete; {considered} actionable items considered.')

