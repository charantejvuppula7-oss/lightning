from types import SimpleNamespace
from unittest.mock import Mock, patch
from uuid import uuid4

from django.test import SimpleTestCase, override_settings
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

from apps.core.sse import stream_response
from services.email import EmailService, _GraphMailClient


@override_settings(MICROSOFT_GRAPH_EMAIL={
    'TENANT_ID': 'test-tenant', 'CLIENT_ID': 'test-client',
    'CLIENT_SECRET': 'test-secret', 'SENDER_UPN': 'sender@example.com',
})
class GraphEmailTests(SimpleTestCase):
    @patch('services.email.requests.post')
    def test_password_reset_uses_graph_client_credentials_and_sendmail(self, post):
        post.side_effect = [SimpleNamespace(status_code=200, json=lambda: {'access_token': 'test-token'}),
                            SimpleNamespace(status_code=202)]
        sent, _ = EmailService.send_password_reset_otp('recipient@example.com', '123456', 'Test User')
        self.assertTrue(sent)
        token, send = post.call_args_list
        self.assertEqual(token.args[0], 'https://login.microsoftonline.com/test-tenant/oauth2/v2.0/token')
        self.assertEqual(token.kwargs['data']['grant_type'], 'client_credentials')
        self.assertEqual(token.kwargs['data']['client_secret'], 'test-secret')
        self.assertEqual(send.args[0], 'https://graph.microsoft.com/v1.0/users/sender%40example.com/sendMail')
        self.assertEqual(send.kwargs['headers']['Authorization'], 'Bearer test-token')
        message = send.kwargs['json']['message']
        self.assertEqual(message['toRecipients'][0]['emailAddress']['address'], 'recipient@example.com')
        self.assertIn('123456', message['body']['content'])

    @override_settings(MICROSOFT_GRAPH_EMAIL={})
    @patch('services.email.requests.post')
    def test_missing_credentials_fail_without_network_or_fallback(self, post):
        sent, _ = _GraphMailClient().send('recipient@example.com', 'Test', '<p>Test</p>')
        self.assertFalse(sent)
        post.assert_not_called()

    @patch('services.email.requests.post')
    def test_graph_authentication_failure_does_not_attempt_another_provider(self, post):
        post.return_value = SimpleNamespace(status_code=401)
        sent, _ = _GraphMailClient().send('recipient@example.com', 'Test', '<p>Test</p>')
        self.assertFalse(sent)
        self.assertEqual(post.call_count, 1)


class LiveStreamTests(SimpleTestCase):
    async def test_stream_connects_before_polling_and_delivers_messages_and_presence(self):
        event_id, created_at = uuid4(), timezone.now()
        fetch = Mock(return_value=[(event_id, created_at, {'content': 'Live message'})])
        response = stream_response(fetch, (created_at, uuid4()), 'new_message', lambda: {'online_ids': ['member']})
        self.assertTrue(response.is_async)
        stream = response.streaming_content
        try:
            self.assertEqual(await anext(stream), b': connected\n\n')
            fetch.assert_not_called()
            self.assertIn(b'event: new_message', await anext(stream))
            self.assertIn(b'event: typing_changed', await anext(stream))
        finally:
            await stream.aclose()
            await response._iterator.aclose()

    async def test_stream_closes_when_project_access_is_revoked(self):
        response = stream_response(Mock(side_effect=PermissionDenied), (timezone.now(), uuid4()), 'new_message')
        stream = response.streaming_content
        self.assertEqual(await anext(stream), b': connected\n\n')
        self.assertIn(b'event: access_revoked', await anext(stream))
        with self.assertRaises(StopAsyncIteration):
            await anext(stream)
