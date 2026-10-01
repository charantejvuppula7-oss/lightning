import asyncio
from datetime import date
from unittest.mock import patch

from asgiref.sync import async_to_sync
from django.test import TestCase
from rest_framework.test import APIClient

from api.models import AuditLog, Milestones, Milestone_Features, Project, Role, Sprint, Task, UserData
from apps.notifications.models import Notification
from apps.notifications.services import generate_due_notifications


class AuditFixTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin_role = Role.objects.create(name='admin')
        cls.member_role = Role.objects.create(name='member', permissions={
            'Projects': {'View': True, 'Create': True, 'Edit': True, 'Delete': True},
            'Tasks': {'View': True, 'Edit': True},
            'Milestones': {'View': True, 'Create': True, 'Edit': True},
            'Features': {'View': True, 'Create': True, 'Edit': True},
        })
        cls.owner = UserData.objects.create(
            user_name='fixowner', employee_id='FO', first_name='Owner', last_name='User',
            email='fixowner@example.com', password='x', date_of_joining=date(2025, 1, 1),
            role_link=cls.admin_role)
        cls.member = UserData.objects.create(
            user_name='fixmember', employee_id='FM', first_name='Member', last_name='User',
            email='fixmember@example.com', password='x', date_of_joining=date(2025, 1, 1),
            role_link=cls.member_role)
        cls.project = Project.objects.create(
            project_name='Fixes', created_by=cls.owner,
            start_date=date(2026, 10, 1), end_date=date(2026, 10, 31))
        cls.project.team_members.add(cls.member)

    def client_for(self, user):
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    def test_nested_creation_requires_child_permissions(self):
        client = self.client_for(self.member)
        response = client.post('/api/projects/', {
            'project_name': 'Denied nested', 'tasks': [{
                'Task_Name': 'Task', 'description': 'Work', 'assigned_to': str(self.member.pk),
            }],
        }, format='json')
        self.assertEqual(response.status_code, 403)
        self.assertFalse(Project.objects.filter(project_name='Denied nested').exists())

    def test_project_relations_remain_within_project(self):
        client = self.client_for(self.owner)
        other = Project.objects.create(project_name='Other', created_by=self.owner)
        task = Task.objects.create(project=other, assigned_to=self.owner,
                                   Task_Name='Other task', description='Work')
        milestone = Milestones.objects.create(
            project=self.project, name='Release', due_date=date(2026, 10, 10),
            created_by=self.owner, updated_by=self.owner)
        self.assertEqual(client.patch(f'/api/milestones/{milestone.pk}/',
                                      {'task': str(task.pk)}, format='json').status_code, 400)
        feature = Milestone_Features.objects.create(Milestone=milestone, feature_name='Feature')
        local_task = Task.objects.create(project=self.project, assigned_to=self.owner,
                                         feature=feature, Task_Name='Local', description='Work')
        other_milestone = Milestones.objects.create(
            project=other, name='Other release', due_date=date(2026, 10, 10),
            created_by=self.owner, updated_by=self.owner)
        self.assertEqual(client.patch(f'/api/features/{feature.pk}/',
                                      {'Milestone': str(other_milestone.pk)}, format='json').status_code, 400)
        local_task.refresh_from_db()
        self.assertEqual(local_task.feature.Milestone.project_id, self.project.pk)

    def test_project_dates_and_deletion_protect_sprints(self):
        client = self.client_for(self.owner)
        sprint = Sprint.objects.create(project=self.project, Sprint_Name='October',
                                       Sprint_start_date=date(2026, 10, 1),
                                       Sprint_end_date=date(2026, 10, 10))
        self.assertEqual(sprint.Number_of_days, 7)
        self.assertEqual(client.patch(f'/api/projects/{self.project.pk}/',
                                      {'start_date': '2026-10-20'}, format='json').status_code, 400)
        self.assertEqual(client.delete(f'/api/projects/{self.project.pk}/').status_code, 400)
        self.assertTrue(Sprint.objects.filter(pk=sprint.pk).exists())

    def test_bulk_sprint_working_days(self):
        response = self.client_for(self.owner).post(
            f'/api/projects/{self.project.pk}/sprints/bulk/', {'sprints': [{
                'Sprint_Name': 'Ten days', 'Sprint_start_date': '2026-10-01',
                'Sprint_end_date': '2026-10-10',
            }]}, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Sprint.objects.get(pk=response.data[0]['id']).Number_of_days, 7)

    def test_reviewer_controls_completion(self):
        task = Task.objects.create(project=self.project, assigned_to=self.member,
                                   review_by=self.owner, Task_Name='Review',
                                   description='Work', status='in_review')
        response = self.client_for(self.member).patch(
            f'/api/tasks/{task.pk}/', {'status': 'completed'}, format='json')
        self.assertEqual(response.status_code, 403)
        task.refresh_from_db()
        self.assertEqual(task.status, 'in_review')

    def test_chat_checks_permission_and_accepts_default_member(self):
        client = self.client_for(self.member)
        url = f'/api/projects/{self.project.pk}/chat/messages/'
        self.assertEqual(client.get(url).status_code, 200)
        self.member_role.permissions = {'Projects': {'View': False}}
        self.member_role.save(update_fields=['permissions'])
        self.assertEqual(client.get(url).status_code, 403)
        self.member_role.permissions = {'Projects': {'View': True}}
        self.member_role.save(update_fields=['permissions'])
        self.project.team_members.remove(self.member)
        self.member.default_projects.add(self.project)
        self.assertEqual(client.get(url).status_code, 200)

    def test_notification_stream_stops_after_deactivation(self):
        response = self.client_for(self.member).get('/api/notifications/stream/')
        UserData.objects.filter(pk=self.member.pk).update(account_status='inactive')

        async def read_event():
            stream = response.streaming_content
            await anext(stream)
            event = await asyncio.wait_for(anext(stream), timeout=4)
            await stream.aclose()
            return event

        self.assertIn(b'event: access_revoked', async_to_sync(read_event)())

    def test_deadline_count_reports_only_inserted_rows(self):
        Task.objects.create(project=self.project, assigned_to=self.member,
                            Task_Name='Due', description='Work', Due_Date=date(2026, 10, 1))
        self.assertEqual(generate_due_notifications(date(2026, 10, 1)), 1)
        self.assertEqual(generate_due_notifications(date(2026, 10, 1)), 0)
        self.assertEqual(Notification.objects.count(), 1)

    def test_deadline_count_excludes_a_concurrent_conflict(self):
        Task.objects.create(project=self.project, assigned_to=self.member,
                            Task_Name='Due', description='Work', Due_Date=date(2026, 10, 1))
        original_bulk_create = Notification.objects.bulk_create

        def competing_insert(items, **kwargs):
            item = items[0]
            Notification.objects.create(
                user_id=item.user_id, notification_type=item.notification_type,
                resource_id=item.resource_id, notification_date=item.notification_date,
                title=item.title, message=item.message)
            return original_bulk_create(items, **kwargs)

        with patch('apps.notifications.services.Notification.objects.bulk_create',
                   side_effect=competing_insert):
            self.assertEqual(generate_due_notifications(date(2026, 10, 1)), 0)
        self.assertEqual(Notification.objects.count(), 1)

    def test_audit_failure_rolls_back_project_creation(self):
        client = self.client_for(self.owner)
        client.raise_request_exception = False
        with patch('apps.audit.services.AuditLog.objects.create', side_effect=RuntimeError('audit failed')):
            response = client.post('/api/projects/', {'project_name': 'Unaudited'}, format='json')
        self.assertEqual(response.status_code, 500)
        self.assertFalse(Project.objects.filter(project_name='Unaudited').exists())
        self.assertFalse(AuditLog.objects.filter(entity_name='Unaudited').exists())
