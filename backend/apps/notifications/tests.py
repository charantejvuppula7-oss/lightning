from datetime import date

from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from api.models import Project, Role, Task, UserData
from apps.chat.services import save_chat_message
from apps.notifications.models import Notification
from apps.notifications.services import schedule_assignment_notice
from apps.notifications.views import (NotificationListView, NotificationMarkAllReadView,
                                      NotificationReadView, UnreadCountView)


class NotificationFlowTests(TestCase):
    def setUp(self):
        role = Role.objects.create(name='Administrator')
        self.sender = self.make_user('sender', role)
        self.recipient = self.make_user('recipient', role)
        self.project = Project.objects.create(project_name='Test project', created_by=self.sender)
        self.factory = APIRequestFactory()

    @staticmethod
    def make_user(name, role):
        return UserData.objects.create(
            user_name=name, employee_id=name, first_name=name, last_name='User',
            email=f'{name}@tachyonautomations.com', password='unused',
            date_of_joining=date(2024, 1, 1), role_link=role,
        )

    def request(self, view, method, path, user, **kwargs):
        request = getattr(self.factory, method)(path)
        force_authenticate(request, user=user)
        return view.as_view()(request, **kwargs)

    def test_assignment_is_listed_for_recipient_and_read_actions_are_scoped(self):
        task = Task.objects.create(project=self.project, assigned_to=self.recipient,
                                   Task_Name='Review design', description='Review design')
        schedule_assignment_notice(task, self.sender)
        notification = Notification.objects.get(user=self.recipient)

        response = self.request(NotificationListView, 'get', '/api/notifications/', self.recipient)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['results'][0]['project'], 'Test project')
        self.assertEqual(response.data['results'][0]['notification_type'], 'task_assigned')
        self.assertEqual(self.request(UnreadCountView, 'get', '/api/notifications/unread-count/',
                                      self.recipient).data['count'], 1)
        self.assertEqual(self.request(NotificationReadView, 'patch', '/api/notifications/read/',
                                      self.sender, notification_id=notification.pk).status_code, 404)
        self.assertEqual(self.request(NotificationReadView, 'patch', '/api/notifications/read/',
                                      self.recipient, notification_id=notification.pk).status_code, 200)
        self.assertFalse(Notification.objects.filter(pk=notification.pk, is_read=False).exists())
        self.assertEqual(self.request(NotificationMarkAllReadView, 'patch',
                                      '/api/notifications/mark-all-read/', self.recipient).data['updated'], 0)

    def test_chat_mention_creates_one_notification_for_a_new_message(self):
        content = 'Please review @recipient'
        payload = {'project_id': self.project.pk, 'content': content, 'client_id': 'same-message'}
        message, created = save_chat_message(self.sender, payload)
        self.assertTrue(created)
        duplicate, created = save_chat_message(self.sender, payload)
        self.assertFalse(created)
        self.assertEqual(message.pk, duplicate.pk)
        self.assertEqual(Notification.objects.filter(user=self.recipient,
                         notification_type=Notification.CHAT_MENTION).count(), 1)


    def test_browser_event_stream_accept_header_is_supported(self):
        from asgiref.sync import async_to_sync
        from apps.chat.views import ChatStreamView
        from apps.notifications.views import NotificationStreamView
        for view, path, kwargs in [(ChatStreamView, f'/api/projects/{self.project.pk}/chat/stream/', {'project_id':self.project.pk}), (NotificationStreamView, '/api/notifications/stream/', {})]:
            request = self.factory.get(path, HTTP_ACCEPT='text/event-stream')
            force_authenticate(request, user=self.sender)
            response = view.as_view()(request, **kwargs)
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response['Content-Type'].startswith('text/event-stream'))
            async def consume():
                stream = response.streaming_content
                self.assertEqual(await anext(stream), b': connected\n\n')
                await stream.aclose()
            async_to_sync(consume)()
