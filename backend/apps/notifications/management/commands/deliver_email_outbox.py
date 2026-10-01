from django.core.management.base import BaseCommand

from apps.notifications.email_outbox import deliver_pending_emails


class Command(BaseCommand):
    help = 'Retry pending account and task emails from the durable outbox.'

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=25)

    def handle(self, *args, **options):
        if options['limit'] < 1:
            raise ValueError('--limit must be positive.')
        sent = deliver_pending_emails(options['limit'])
        self.stdout.write(f'Delivered {sent} email(s).')
