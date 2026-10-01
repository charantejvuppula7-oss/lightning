import logging

from django.core.management.base import BaseCommand

from apps.notifications.services import generate_due_notifications


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Create in-app notifications for due and overdue tasks and dependencies.'

    def handle(self, *args, **options):
        try:
            considered = generate_due_notifications()
        except Exception:
            logger.exception('notification_deadline_check_failed')
            raise
        self.stdout.write(f'Deadline check complete; {considered} actionable items considered.')
