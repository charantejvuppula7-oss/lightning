"""Regression coverage for atomic project edits and protected legacy media URLs."""
from datetime import date
from unittest.mock import patch
from uuid import uuid4
from tempfile import TemporaryDirectory

from django.http import HttpResponse
from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.signals import request_finished
from django.db import close_old_connections
from rest_framework.test import APIClient

from api.models import Milestones, Project, ResourceFile, Role, Task, UserData


class ProjectUpdateTests(TestCase):
    def setUp(self):
        role = Role.objects.create(name='Admin')
        self.user = UserData.objects.create(user_name='editor', employee_id='EDIT1', first_name='Editor',
            last_name='Test', email='editor@example.com', password='unused', date_of_joining=date(2025, 1, 1), role_link=role)
        self.project = Project.objects.create(project_name='Original', created_by=self.user)
        self.milestone = Milestones.objects.create(project=self.project, name='Keep on failure', due_date=date(2027, 1, 1),
                                                  created_by=self.user, updated_by=self.user)
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def update(self, changes):
        return self.client.patch(f'/api/projects/{self.project.pk}/update/', {'changes': changes}, format='json')

    def test_failed_change_rolls_back_prior_updates_and_deletions(self):
        response = self.update([
            {'resource': 'projects', 'method': 'PATCH', 'id': str(self.project.pk), 'body': {'project_name': 'Changed'}},
            {'resource': 'milestones', 'method': 'DELETE', 'id': str(self.milestone.pk)},
            {'resource': 'milestones', 'method': 'POST', 'id': 'new:2', 'body': {'project': str(self.project.pk), 'name': ''}},
        ])
        self.assertEqual(response.status_code, 400, response.data)
        self.project.refresh_from_db()
        self.assertEqual(self.project.project_name, 'Original')
        self.assertTrue(Milestones.objects.filter(pk=self.milestone.pk).exists())

    def test_full_and_partial_resource_updates_keep_different_validation(self):
        path = f'/api/projects/{self.project.pk}/'
        full = self.client.put(path, {'description': 'Missing required name'}, format='json')
        self.assertEqual(full.status_code, 400, full.data)
        partial = self.client.patch(path, {'description': 'Allowed partial update'}, format='json')
        self.assertEqual(partial.status_code, 200, partial.data)

    def test_new_feature_resolves_milestone_reference(self):
        response = self.update([
            {'resource': 'milestones', 'method': 'POST', 'id': 'new:0', 'body': {'project': str(self.project.pk), 'name': 'New milestone', 'due_date': '2027-01-02'}},
            {'resource': 'features', 'method': 'POST', 'id': 'new:1', 'body': {'Milestone': 'new:0', 'feature_name': 'New feature'}},
        ])
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(self.project.milestones_set.get(name='New milestone').features.filter(feature_name='New feature').exists())

    def test_child_from_another_project_cannot_be_changed(self):
        foreign = Project.objects.create(project_name='Other', created_by=self.user)
        response = self.update([{'resource': 'milestones', 'method': 'PATCH', 'id': str(self.milestone.pk),
                                 'body': {'project': str(foreign.pk)}}])
        self.assertEqual(response.status_code, 400, response.data)
        self.milestone.refresh_from_db()
        self.assertEqual(self.milestone.project_id, self.project.pk)

    def test_temporary_reference_cannot_reuse_an_existing_record_identifier(self):
        response = self.update([{'resource': 'features', 'method': 'POST', 'id': str(uuid4()),
            'body': {'Milestone': str(self.milestone.pk), 'feature_name': 'Invalid reference'}}])
        self.assertEqual(response.status_code, 400, response.data)
        self.assertFalse(self.milestone.features.exists())

    def test_project_update_retains_unchanged_legacy_plain_text_remarks(self):
        task = Task.objects.create(project=self.project, assigned_to=self.user, Task_Name='Legacy task', description='', Remarks='Existing notes')
        response = self.update([{'resource': 'tasks', 'method': 'PATCH', 'id': str(task.pk),
                                 'body': {'Task_Name': 'Renamed task', 'Remarks': 'Existing notes'}}])
        self.assertEqual(response.status_code, 200, response.data)
        task.refresh_from_db()
        self.assertEqual(task.Remarks, 'Existing notes')

    def test_notification_preferences_persist_and_targets_are_recipient_only(self):
        from apps.notifications.models import Notification
        from django.utils import timezone
        response = self.client.patch('/api/notifications/preferences/', {'notify_task_status': False}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.user.refresh_from_db()
        self.assertFalse(self.user.notify_task_status)
        task = Task.objects.create(project=self.project, assigned_to=self.user, Task_Name='Task', description='')
        note = Notification.objects.create(user=self.user, resource_id=task.pk, title='Assigned', message='Assigned',
                                           notification_type='task_assigned', notification_date=timezone.localdate())
        response = self.client.get(f'/api/notifications/{note.pk}/target/')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['taskId'], str(task.pk))
        self.assertEqual(self.client.get(f'/api/notifications/{uuid4()}/target/').status_code, 404)

    def test_generic_task_update_applies_timer_and_review_rules(self):
        task = Task.objects.create(project=self.project, assigned_to=self.user, Task_Name='Task', description='')
        path = f'/api/tasks/{task.pk}/'
        response = self.client.patch(path, {'status': 'in_progress'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        task.refresh_from_db()
        self.assertIsNotNone(task.start_Time)
        response = self.client.patch(path, {'status': 'completed'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        task.refresh_from_db()
        self.assertIsNone(task.start_Time)
        self.assertIsNotNone(task.Time_Taken)

    def test_document_uploads_and_project_files_share_storage_and_audit(self):
        from api.models import AuditLog
        with TemporaryDirectory(prefix='lighting-doc-test-') as folder, override_settings(MEDIA_ROOT=folder):
            response = self.client.post('/api/documents/', {'project': str(self.project.pk),
                'file': SimpleUploadedFile('document.txt', b'private document')}, format='multipart')
            self.assertEqual(response.status_code, 201, response.data)
            document = ResourceFile.objects.get(pk=response.data['id'])
            self.assertTrue(document.file.storage.exists(document.file.name))
            self.assertTrue(AuditLog.objects.filter(entity_id=document.pk, action='created').exists())
            response = self.client.get(f'/media/{document.file.name}')
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response['Cache-Control'], 'private, no-store')
            # Consume/close the streaming response without closing TestCase's enclosing transaction.
            request_finished.disconnect(close_old_connections)
            try:
                self.assertEqual(b''.join(response.streaming_content), b'private document')
            finally:
                request_finished.connect(close_old_connections)
            response = self.client.post(f'/api/projects/{self.project.pk}/files/',
                {'files': [SimpleUploadedFile('project.txt', b'project file')]}, format='multipart')
            self.assertEqual(response.status_code, 201, response.data)
            project_file = ResourceFile.objects.get(file_name='project.txt')
            self.assertTrue(AuditLog.objects.filter(entity_id=project_file.pk, action='created').exists())

    @patch('apps.documents.views.download_response', return_value=HttpResponse('private file'))
    def test_legacy_media_requires_authentication_and_project_membership(self, download):
        document = ResourceFile.objects.create(project=self.project, file='documents/project_test/private.txt', file_name='private.txt')
        path = f'/media/{document.file.name}'
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(path).status_code, 401)
        download.assert_not_called()
        role = Role.objects.create(name='Reader', permissions={'Documents': {'View': True}})
        self.user.role_link = role
        self.user.save(update_fields=['role_link'])
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.get(path).status_code, 200)
        foreign = Project.objects.create(project_name='Not assigned', created_by=UserData.objects.create(
            user_name='other', employee_id='EDIT2', first_name='Other', last_name='Test', email='other@example.com',
            password='unused', date_of_joining=date(2025, 1, 1), role_link=role))
        document.project = foreign
        document.save(update_fields=['project'])
        self.assertEqual(self.client.get(path).status_code, 404)
