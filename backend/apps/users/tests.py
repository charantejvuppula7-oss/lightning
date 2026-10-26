from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from api.models import Role, UserData
from apps.notifications.models import EmailOutbox


class BootstrapAdminTests(TestCase):
    @override_settings(SESSION_COOKIE_SECURE=False, CSRF_COOKIE_SECURE=False,
                       SESSION_COOKIE_NAME='lighting_v2_sessionid', CSRF_COOKIE_NAME='lighting_v2_csrftoken')
    def test_admin_can_log_in_over_http_without_sending_email(self):
        call_command('bootstrap_admin', stdout=StringIO())
        user = UserData.objects.get(user_name='admin')
        self.assertTrue(user.check_password('admin'))
        self.assertNotEqual(user.password, 'admin')
        self.assertFalse(EmailOutbox.objects.exists())
        client = APIClient(enforce_csrf_checks=True)
        token = client.get('/api/auth/csrf/').data['csrfToken']
        response = client.post('/api/auth/login/', {'identifier': 'admin', 'password': 'admin'},
                               format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIn('lighting_v2_sessionid', response.cookies)
        self.assertFalse(response.cookies['lighting_v2_sessionid']['secure'])

    def test_redeployment_does_not_reset_admin_password(self):
        call_command('bootstrap_admin', stdout=StringIO())
        user = UserData.objects.get(user_name='admin')
        user.set_password('Changed-password-123!')
        user.save()
        call_command('bootstrap_admin', stdout=StringIO())
        user.refresh_from_db()
        self.assertTrue(user.check_password('Changed-password-123!'))
        self.assertEqual(UserData.objects.count(), 1)

    def test_existing_non_admin_is_not_promoted_or_overwritten(self):
        role = Role.objects.create(name='developer')
        UserData.objects.create(user_name='admin', employee_id='existing', first_name='Existing',
                                last_name='', email='existing@example.com', password='unchanged',
                                date_of_joining=timezone.localdate(), role_link=role)
        with self.assertRaises(CommandError):
            call_command('bootstrap_admin', stdout=StringIO())
        self.assertEqual(UserData.objects.get(user_name='admin').password, 'unchanged')
