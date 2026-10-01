import asyncio
from datetime import date, timedelta
from unittest.mock import patch

from asgiref.sync import async_to_sync
from django.contrib.auth.hashers import make_password
from django.core.management import call_command
from django.test import TestCase
from rest_framework.exceptions import PermissionDenied
from rest_framework.test import APIClient

from api.models import Project, ProjectChatMessage, Role, Task, TaskDependency, UserData
from apps.chat.services import save_chat_message
from apps.chat.models import ChatTypingState
from apps.notifications.models import Notification
from apps.notifications.services import generate_due_notifications


class NotificationAndChatTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        role = Role.objects.create(name='admin')
        member_role = Role.objects.create(name='member', permissions={'Projects': {'View': True}})
        cls.owner = UserData.objects.create(
            user_name='owner', employee_id='N1', first_name='Owner', last_name='User',
            email='owner@example.com', password=make_password('password'),
            date_of_joining=date(2025, 1, 1), role_link=role)
        cls.member = UserData.objects.create(
            user_name='member', employee_id='N2', first_name='Member', last_name='User',
            email='member@example.com', password=make_password('password'),
            date_of_joining=date(2025, 1, 1), role_link=member_role)
        cls.outsider = UserData.objects.create(
            user_name='outsider', employee_id='N3', first_name='Other', last_name='User',
            email='other@example.com', password=make_password('password'),
            date_of_joining=date(2025, 1, 1), role_link=member_role)
        cls.project = Project.objects.create(project_name='PMS', created_by=cls.owner)
        cls.project.team_members.add(cls.member)

    def client_for(self, user):
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    def test_deadline_alerts_are_actionable_deduplicated_and_date_sensitive(self):
        today = date(2026, 10, 1)
        task_today = Task.objects.create(project=self.project, assigned_to=self.member,
                                         Task_Name='Today', description='Work', Due_Date=today)
        task_late = Task.objects.create(project=self.project, assigned_to=self.member,
                                        Task_Name='Late', description='Work',
                                        Due_Date=today - timedelta(days=1))
        Task.objects.create(project=self.project, assigned_to=self.member,
                            Task_Name='Finished', description='Work', Due_Date=today,
                            status='completed')
        dep_today = TaskDependency.objects.create(task=task_today, assigned_to=self.owner,
                                                  description='Review', due_date=today)
        dep_late = TaskDependency.objects.create(task=task_late,
                                                 description='Waiting',
                                                 due_date=today - timedelta(days=1))
        TaskDependency.objects.create(task=task_late, description='No deadline')
        TaskDependency.objects.create(task=task_today, description='Resolved', due_date=today,
                                      status='completed')

        generate_due_notifications(today)
        generate_due_notifications(today)
        self.assertEqual(Notification.objects.count(), 4)
        self.assertEqual(set(Notification.objects.values_list('notification_type', flat=True)),
                         {Notification.TASK_DUE_TODAY, Notification.TASK_OVERDUE,
                          Notification.DEPENDENCY_DUE_TODAY, Notification.DEPENDENCY_OVERDUE})
        self.assertEqual(Notification.objects.get(resource_id=dep_today.pk).user_id, self.owner.pk)
        self.assertEqual(Notification.objects.get(resource_id=dep_late.pk).user_id, self.member.pk)

        task_late.Due_Date = today + timedelta(days=3)
        task_late.save(update_fields=['Due_Date'])
        generate_due_notifications(today + timedelta(days=1))
        self.assertFalse(Notification.objects.filter(resource_id=task_late.pk,
                       notification_date=today + timedelta(days=1)).exists())

    def test_notification_api_is_private_and_updates_read_state(self):
        own = Notification.objects.create(user=self.member, notification_type=Notification.TASK_DUE_TODAY,
                                          resource_id=self.project.pk, title='Due', message='Due today',
                                          notification_date=date(2026, 10, 1))
        Notification.objects.create(user=self.outsider, notification_type=Notification.TASK_OVERDUE,
                                    resource_id=self.project.pk, title='Late', message='Overdue',
                                    notification_date=date(2026, 10, 1))
        client = self.client_for(self.member)
        response = client.get('/api/notifications/', {'is_read': 'false'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(client.get('/api/notifications/unread-count/').data['count'], 1)
        self.assertEqual(client.patch(f'/api/notifications/{own.pk}/read/').status_code, 200)
        self.assertEqual(client.get('/api/notifications/unread-count/').data['count'], 0)
        self.assertEqual(client.patch('/api/notifications/mark-all-read/').data['updated'], 0)
        stranger_id = Notification.objects.get(user=self.outsider).pk
        self.assertEqual(client.patch(f'/api/notifications/{stranger_id}/read/').status_code, 404)
        self.assertEqual(client.get('/api/notifications/', {'is_read': 'invalid'}).status_code, 400)
        self.assertEqual(APIClient().get('/api/notifications/').status_code, 401)

    def test_chat_message_is_saved_once_and_history_is_scoped(self):
        data = {'project_id': self.project.pk, 'content': 'Hello', 'client_id': 'client-1'}
        message, created = save_chat_message(self.member, data)
        duplicate, created_again = save_chat_message(self.member, data)
        self.assertTrue(created)
        self.assertFalse(created_again)
        self.assertEqual(message.pk, duplicate.pk)
        self.assertEqual(ProjectChatMessage.objects.count(), 1)
        with self.assertRaises(PermissionDenied):
            save_chat_message(self.outsider, data)
        response = self.client_for(self.member).get(
            f'/api/projects/{self.project.pk}/chat/messages/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(self.client_for(self.outsider).get(
            f'/api/projects/{self.project.pk}/chat/messages/').status_code, 403)

    def test_chat_replies_and_typing_are_project_scoped(self):
        member = self.client_for(self.member)
        url = f'/api/projects/{self.project.pk}/chat/messages/'
        parent = member.post(url, {'content': 'Question'}, format='json')
        reply = member.post(url, {'content': 'Answer', 'parent_message_id': parent.data['id']},
                            format='json')
        self.assertEqual(reply.status_code, 201)
        self.assertEqual(reply.data['parent_message_id'], parent.data['id'])
        self.assertEqual(member.get(url).data['count'], 1)
        thread = member.get(f'{url}{parent.data["id"]}/thread/')
        self.assertEqual(thread.status_code, 200)
        self.assertEqual(thread.data['count'], 1)
        self.assertEqual(thread.data['parent']['id'], parent.data['id'])
        self.assertEqual(member.post(url, {'content': 'Nested', 'parent_message_id': reply.data['id']},
                                     format='json').status_code, 400)
        other_project = Project.objects.create(project_name='Other', created_by=self.owner)
        other_parent, _ = save_chat_message(
            self.owner, {'project_id': other_project.pk, 'content': 'Elsewhere'})
        self.assertEqual(member.post(url, {'content': 'Wrong room',
                                           'parent_message_id': str(other_parent.pk)},
                                     format='json').status_code, 400)
        self.assertEqual(self.client_for(self.outsider).get(
            f'{url}{parent.data["id"]}/thread/').status_code, 403)

        typing_url = f'/api/projects/{self.project.pk}/chat/typing/'
        self.assertEqual(member.post(typing_url, {'active': True}, format='json').status_code, 204)
        self.assertEqual(ChatTypingState.objects.count(), 1)
        stream = self.client_for(self.owner).get(f'/api/projects/{self.project.pk}/chat/stream/')

        async def typing_event(response):
            content = response.streaming_content
            await anext(content)
            event = await asyncio.wait_for(anext(content), timeout=4)
            await content.aclose()
            return event

        event = async_to_sync(typing_event)(stream)
        self.assertIn(b'event: typing_changed', event)
        self.assertIn(str(self.member.pk).encode(), event)
        self.assertEqual(member.post(typing_url, {'active': False}, format='json').status_code, 204)
        self.assertEqual(ChatTypingState.objects.count(), 0)
        self.assertEqual(self.client_for(self.outsider).post(
            typing_url, {'active': True}, format='json').status_code, 403)

    def test_sse_streams_committed_notification_and_chat_message(self):
        async def next_event(response):
            stream = response.streaming_content
            await anext(stream)  # connected comment
            event = await asyncio.wait_for(anext(stream), timeout=4)
            await stream.aclose()
            return event

        notification_stream = self.client_for(self.member).get('/api/notifications/stream/')
        self.assertEqual(notification_stream.status_code, 200)
        notification = Notification.objects.create(
            user=self.member, notification_type=Notification.TASK_DUE_TODAY,
            resource_id=self.project.pk, title='Due', message='Due today',
            notification_date=date(2026, 10, 1))
        event = async_to_sync(next_event)(notification_stream)
        self.assertIn(f'id: {notification.pk}'.encode(), event)
        self.assertIn(b'event: new_notification', event)
        self.assertEqual(APIClient().get('/api/notifications/stream/').status_code, 401)
        self.assertEqual(self.client_for(self.outsider).get(
            '/api/notifications/stream/', HTTP_LAST_EVENT_ID=str(notification.pk)).status_code, 400)

        chat_client = self.client_for(self.member)
        chat_stream = chat_client.get(f'/api/projects/{self.project.pk}/chat/stream/')
        self.assertEqual(chat_stream.status_code, 200)
        payload = {'content': 'Hello', 'client_id': 'replay-1'}
        first = chat_client.post(f'/api/projects/{self.project.pk}/chat/messages/',
                                 payload, format='json')
        second = chat_client.post(f'/api/projects/{self.project.pk}/chat/messages/',
                                  payload, format='json')
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.data['id'], second.data['id'])
        event = async_to_sync(next_event)(chat_stream)
        self.assertIn(f'id: {first.data["id"]}'.encode(), event)
        self.assertIn(b'event: new_message', event)
        self.assertEqual(chat_client.post(f'/api/projects/{self.project.pk}/chat/messages/',
                                          {'content': '  '}, format='json').status_code, 400)
        self.assertEqual(self.client_for(self.outsider).get(
            f'/api/projects/{self.project.pk}/chat/stream/').status_code, 403)

    def test_chat_stream_resumes_and_stops_after_membership_revocation(self):
        client = self.client_for(self.member)
        url = f'/api/projects/{self.project.pk}/chat/messages/'
        first = client.post(url, {'content': 'First', 'client_id': 'first'}, format='json')
        self.assertEqual(first.status_code, 201)
        stream = client.get(f'/api/projects/{self.project.pk}/chat/stream/',
                            HTTP_LAST_EVENT_ID=first.data['id'])
        second = client.post(url, {'content': 'Second', 'client_id': 'second'}, format='json')
        self.assertEqual(second.status_code, 201)

        async def read_event(response):
            content = response.streaming_content
            await anext(content)
            event = await asyncio.wait_for(anext(content), timeout=4)
            await content.aclose()
            return event

        event = async_to_sync(read_event)(stream)
        self.assertIn(f'id: {second.data["id"]}'.encode(), event)
        self.assertNotIn(f'id: {first.data["id"]}'.encode(), event)

        revoked_stream = client.get(f'/api/projects/{self.project.pk}/chat/stream/')
        self.project.team_members.remove(self.member)
        self.assertIn(b'event: access_revoked', async_to_sync(read_event)(revoked_stream))
        self.assertEqual(client.post(url, {'content': 'Denied'}, format='json').status_code, 403)

    def test_management_command_runs_checker(self):
        with patch('apps.notifications.management.commands.generate_due_notifications.generate_due_notifications',
                   return_value=0) as checker:
            call_command('generate_due_notifications')
        checker.assert_called_once_with()

