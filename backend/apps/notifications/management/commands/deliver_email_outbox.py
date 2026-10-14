"""
Management command to flush pending or retriable outbound emails from EmailOutbox.
"""

from django.core.management.base import BaseCommand

from apps.notifications.email_outbox import deliver_pending_emails


class Command(BaseCommand):
    """
    Django management command: `python manage.py deliver_email_outbox`.

    Scans the database outbox table for pending or expired lease messages and dispatches
    them sequentially up to a configurable batch limit.
    """
    help = 'Retry pending account and task emails from the durable outbox.'

    def add_arguments(self, parser):
        """
        Define CLI flags and parameters.

        Args:
            parser (CommandParser): Argument parser.
        """
        parser.add_argument(
            '--limit',
            type=int,
            default=25,
            help='Maximum number of emails to attempt to deliver in this run (default: 25).'
        )

    def handle(self, *args, **options):
        """
        Execute command logic.

        Args:
            *args: Variable positional arguments.
            **options: Parsed command-line options.

        Raises:
            ValueError: If `--limit` is less than 1.
        """
        if options['limit'] < 1:
            raise ValueError('--limit must be positive.')
        sent = deliver_pending_emails(options['limit'])
        self.stdout.write(f'Delivered {sent} email(s).')

