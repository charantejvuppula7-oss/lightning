from datetime import date
from unittest.mock import patch

from django.contrib.auth.hashers import make_password
from django.test import TestCase
from rest_framework.test import APIClient

from api.models import PasswordResetOTP, UserData


class PasswordResetTests(TestCase):
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
        self.assertEqual(response.status_code, 200)
        self.assertFalse(PasswordResetOTP.objects.exists())
