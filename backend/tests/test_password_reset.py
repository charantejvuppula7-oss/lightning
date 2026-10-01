from datetime import date, timedelta
from unittest.mock import patch

from django.contrib.auth.hashers import make_password
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from api.models import PasswordResetOTP, UserData
from apps.users.serializers import UserSerializer


class PasswordResetTests(TestCase):
    def setUp(self):
        cache.clear()

    @classmethod
    def setUpTestData(cls):
        cls.user = UserData.objects.create(
            user_name='resetuser', employee_id='RESET1', first_name='Reset',
            last_name='User', email='reset@example.com',
            password=make_password('old-password-123'), date_of_joining=date(2025, 1, 1))

    def test_otp_reset_is_one_use_and_invalidates_old_password(self):
        client = APIClient()
        with patch('apps.users.auth.services.EmailService.send_password_reset_otp',
                   return_value=(True, 'sent')) as send, self.captureOnCommitCallbacks(execute=True):
            response = client.post('/api/user/password-reset/request/',
                                   {'username': self.user.user_name}, format='json')
        self.assertEqual(response.status_code, 200)
        code = send.call_args.args[1]
        record = PasswordResetOTP.objects.get(user=self.user)
        self.assertNotEqual(record.otp_code, code)
        self.assertEqual(client.post('/api/user/password-reset/verify-otp/',
                                     {'username': self.user.user_name, 'code': '000000'},
                                     format='json').status_code, 400)
        verified = client.post('/api/user/password-reset/verify-otp/',
                               {'username': self.user.user_name, 'code': code}, format='json')
        self.assertEqual(verified.status_code, 200)
        token = verified.data['reset_token']
        self.assertEqual(client.post('/api/user/password-reset/confirm/',
                                     {'reset_token': token, 'password': 'new-password-123'},
                                     format='json').status_code, 200)
        self.assertEqual(client.post('/api/user/password-reset/confirm/',
                                     {'reset_token': token, 'password': 'another-password-123'},
                                     format='json').status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('new-password-123'))
        self.assertFalse(self.user.check_password('old-password-123'))

    def test_unknown_account_does_not_create_otp(self):
        response = APIClient().post('/api/auth/password-reset/request/',
                                    {'identifier': 'missing@example.com'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('identifier', response.data)
        self.assertFalse(PasswordResetOTP.objects.exists())

    def test_delivery_failure_is_reported_and_code_cannot_be_used(self):
        with patch('apps.users.auth.services.EmailService.send_password_reset_otp',
                   return_value=(False, 'provider unavailable')):
            response = APIClient().post('/api/auth/password-reset/request/',
                                        {'identifier': self.user.user_name}, format='json')
        self.assertEqual(response.status_code, 503)
        self.assertTrue(PasswordResetOTP.objects.get(user=self.user).is_used)

    def test_inactive_account_cannot_request_reset(self):
        self.user.account_status = 'inactive'
        self.user.save(update_fields=['account_status'])
        response = APIClient().post('/api/auth/password-reset/request/',
                                    {'identifier': self.user.user_name}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(PasswordResetOTP.objects.exists())

    def test_mail_provider_exception_is_reported(self):
        with patch('apps.users.auth.services.EmailService.send_password_reset_otp',
                   side_effect=OSError('connection failed')):
            response = APIClient().post('/api/auth/password-reset/request/',
                                        {'identifier': self.user.user_name}, format='json')
        self.assertEqual(response.status_code, 503)
        self.assertTrue(PasswordResetOTP.objects.get(user=self.user).is_used)

    @override_settings(MICROSOFT_GRAPH_EMAIL={})
    def test_missing_graph_configuration_is_reported(self):
        response = APIClient().post('/api/auth/password-reset/request/',
                                    {'identifier': self.user.user_name}, format='json')
        self.assertEqual(response.status_code, 503)
        self.assertTrue(PasswordResetOTP.objects.get(user=self.user).is_used)

    def test_per_account_reset_limit_does_not_claim_mail_was_sent(self):
        for _ in range(3):
            PasswordResetOTP.objects.create(user=self.user, otp_code='unused',
                                            expires_at=timezone.now() + timedelta(minutes=10))
        with patch('apps.users.auth.services.EmailService.send_password_reset_otp') as send:
            response = APIClient().post('/api/auth/password-reset/request/',
                                        {'identifier': self.user.user_name}, format='json')
        self.assertEqual(response.status_code, 429)
        send.assert_not_called()

    def test_company_email_domain_validation_is_preserved(self):
        self.assertEqual(UserSerializer._company_email(' PERSON@TACHYONAUTOMATIONS.COM '),
                         'person@tachyonautomations.com')
        self.assertEqual(UserSerializer._company_email('person@tachyonadvancedsystems.com'),
                         'person@tachyonadvancedsystems.com')
        from rest_framework.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            UserSerializer._company_email('person@external.com')
        with self.assertRaises(ValidationError):
            UserSerializer._company_email('@tachyonautomations.com')
