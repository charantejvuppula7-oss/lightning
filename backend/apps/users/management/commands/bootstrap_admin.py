from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from api.models import Role, UserData
from apps.roles.permissions import is_admin


class Command(BaseCommand):
    help = 'Create the initial admin account without changing an existing account.'

    @transaction.atomic
    def handle(self, *args, **options):
        existing = UserData.objects.filter(user_name__iexact='admin').select_related('role_link').first()
        if existing:
            if not is_admin(existing):
                raise CommandError('An existing non-admin or inactive account already uses admin. Resolve it manually.')
            self.stdout.write('Admin already exists; its password was preserved.')
            return
        role, _ = Role.objects.get_or_create(name='admin')
        user = UserData(
            user_name='admin', employee_id='LIGHTING-V2-ADMIN', first_name='Admin', last_name='',
            email='admin@localhost.invalid', date_of_joining=timezone.localdate(), role_link=role,
        )
        user.set_password('admin')
        user.save()
        self.stdout.write('Initial admin created. Change the bootstrap password after login.')
