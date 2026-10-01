from datetime import date, timedelta
from unittest.mock import patch

from django.contrib.auth.hashers import check_password, make_password
from django.contrib.sessions.models import Session
from django.db import connection, transaction, IntegrityError
from django.test import TestCase, override_settings
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient

from api.models import AuditLog, Department, Milestones, Milestone_Features, Project, Role, Sprint, Task, TaskDependency, UserData
from apps.notifications.models import EmailOutbox


@override_settings(SESSION_ENGINE='django.contrib.sessions.backends.db')
class ApiFlowTests(TestCase):
    def test_bulk_models_use_dedicated_model_modules(self):
        self.assertEqual(Sprint.__module__, 'apps.sprints.models')
        self.assertEqual(Task.__module__, 'apps.tasks.models')
        self.assertEqual(TaskDependency.__module__, 'apps.dependencies.models')
        self.assertEqual(Sprint._meta.app_label, 'api')

    @classmethod
    def setUpTestData(cls):
        admin_role = Role.objects.create(name='admin')
        pm_role = Role.objects.create(name='pm', permissions={
            module: {'View': True, 'Create': True, 'Edit': True, 'Delete': True}
            for module in ('Projects', 'Tasks', 'Milestones', 'Features', 'Dependencies', 'User Management')
        })
        developer_role = Role.objects.create(name='developer', permissions={
            'Projects': {'View': True}, 'Tasks': {'View': True, 'Edit': True},
        })
        cls.admin = UserData.objects.create(
            user_name='admin', employee_id='A1', first_name='Admin', last_name='User',
            email='admin@example.com', password=make_password('Strong-password-123'),
            date_of_joining=date(2025, 1, 1), role_link=admin_role)
        cls.pm = UserData.objects.create(
            user_name='manager', employee_id='P1', first_name='Project', last_name='Manager',
            email='pm@example.com', password=make_password('Strong-password-123'),
            date_of_joining=date(2025, 1, 1), role_link=pm_role)
        cls.developer = UserData.objects.create(
            user_name='developer', employee_id='D1', first_name='Dev', last_name='User',
            email='dev@example.com', password=make_password('Strong-password-123'),
            date_of_joining=date(2025, 1, 1), role_link=developer_role,
            manager=cls.pm)
        cls.project = Project.objects.create(project_name='Demo', created_by=cls.pm)
        cls.project.team_members.add(cls.developer)

    def client_for(self, identifier='manager'):
        client = APIClient(enforce_csrf_checks=True)
        token = client.get('/api/auth/csrf/').data['csrfToken']
        response = client.post('/api/auth/login/', {
            'identifier': identifier, 'password': 'Strong-password-123',
        }, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 200, response.data)
        return client, response.data['csrfToken']

    def test_email_login_session_logout_and_csrf(self):
        client, token = self.client_for('pm@example.com')
        self.assertEqual(client.get('/api/auth/session/').status_code, 200)
        self.assertEqual(client.post('/api/auth/logout/').status_code, 403)
        self.assertEqual(client.post('/api/auth/logout/', HTTP_X_CSRFTOKEN=token).status_code, 204)
        self.assertEqual(client.get('/api/auth/session/').status_code, 401)

    def test_user_creation_is_authorized_and_password_is_hashed(self):
        client, token = self.client_for('manager')
        payload = {
            'user_name': 'newdev', 'employee_id': 'D2', 'first_name': 'New',
            'last_name': 'Dev', 'email': 'new@tachyonautomations.com',
            'password': 'Another-strong-password-123', 'date_of_joining': '2025-01-01',
            'role_link': str(self.developer.role_link_id), 'manager': str(self.pm.pk),
            'department': 'Software', 'employment_type': 'full_time',
        }
        response = client.post('/api/users/', payload, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 201, response.data)
        self.assertNotIn('password', response.data)
        self.assertTrue(check_password(payload['password'], UserData.objects.get(user_name='newdev').password))
        payload['user_name'] = 'admin2'
        payload['email'] = 'admin2@tachyonautomations.com'
        payload['employee_id'] = 'A2'
        payload['role_link'] = str(self.admin.role_link_id)
        self.assertEqual(client.post('/api/users/', payload, format='json', HTTP_X_CSRFTOKEN=token).status_code, 403)
        self.assertFalse(UserData.objects.filter(user_name='admin2').exists())

    def test_task_status_flow_and_rejected_skip(self):
        client, token = self.client_for('manager')
        response = client.post('/api/tasks/', {
            'Task_Name': 'Implement', 'project': str(self.project.pk),
            'assigned_to': str(self.developer.pk), 'description': 'Work',
        }, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 201, response.data)
        task_id = response.data['id']
        self.assertEqual(response.data['status'], 'open')
        url = f'/api/tasks/{task_id}/'
        self.assertEqual(client.patch(url, {'status': 'completed'}, format='json', HTTP_X_CSRFTOKEN=token).status_code, 400)
        self.assertEqual(Task.objects.get(pk=task_id).status, 'open')
        for next_status in ('in_progress', 'in_review', 'completed'):
            response = client.patch(url, {'status': next_status}, format='json', HTTP_X_CSRFTOKEN=token)
            self.assertEqual(response.status_code, 200, response.data)
            self.assertEqual(response.data['status'], next_status)

    def test_developer_cannot_create_task(self):
        client, token = self.client_for('developer')
        response = client.post('/api/tasks/', {
            'Task_Name': 'Forbidden', 'project': str(self.project.pk),
            'assigned_to': str(self.developer.pk), 'description': 'Work',
        }, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 403)
        self.assertFalse(Task.objects.filter(Task_Name='Forbidden').exists())

    def test_developer_can_advance_only_assigned_task_status(self):
        task = Task.objects.create(project=self.project, assigned_to=self.developer,
                                   Task_Name='Assigned', description='Work')
        client, token = self.client_for('developer')
        url = f'/api/tasks/{task.pk}/'
        response = client.patch(url, {'status': 'in_progress'}, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 200, response.data)
        response = client.patch(url, {'description': 'Changed'}, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 403)
        task.refresh_from_db()
        self.assertEqual(task.description, 'Work')

    def test_project_milestone_feature_crud_and_dependency_protection(self):
        client, token = self.client_for('admin')
        def write(method, url, payload=None):
            return getattr(client, method)(url, payload, format='json', HTTP_X_CSRFTOKEN=token)

        response = write('post', '/api/projects/', {'project_name': 'CRUD project'})
        self.assertEqual(response.status_code, 201, response.data)
        project_url = f"/api/projects/{response.data['id']}/"
        project_id = response.data['id']
        response = write('patch', project_url, {'description': 'Updated'})
        self.assertEqual(response.status_code, 200, response.data)
        response = write('post', '/api/milestones/', {
            'project': project_id, 'name': 'Delivery', 'due_date': '2026-12-01'})
        self.assertEqual(response.status_code, 201, response.data)
        milestone_id = response.data['id']
        milestone_url = f'/api/milestones/{milestone_id}/'
        response = write('post', '/api/features/', {
            'Milestone': milestone_id, 'feature_name': 'Feature'})
        self.assertEqual(response.status_code, 201, response.data)
        feature_url = f"/api/features/{response.data['id']}/"
        self.assertEqual(client.get(feature_url).status_code, 200)
        self.assertEqual(write('patch', feature_url, {'feature_status': 'in_progress'}).status_code, 200)
        self.assertEqual(write('delete', milestone_url).status_code, 400)
        self.assertTrue(Milestones.objects.filter(pk=milestone_id).exists())
        self.assertEqual(write('delete', project_url).status_code, 400)
        self.assertEqual(write('delete', feature_url).status_code, 204)
        self.assertEqual(write('patch', milestone_url, {'name': 'Updated delivery'}).status_code, 200)
        self.assertEqual(write('delete', milestone_url).status_code, 204)
        self.assertEqual(write('delete', project_url).status_code, 204)

    def test_inactive_account_invalidates_session(self):
        client, _ = self.client_for('developer')
        UserData.objects.filter(pk=self.developer.pk).update(account_status='inactive')
        self.assertEqual(client.get('/api/auth/session/').status_code, 401)
        self.assertNotIn('user_id', client.session)

    def test_expired_session_is_not_authenticated(self):
        client, _ = self.client_for('developer')
        Session.objects.filter(session_key=client.session.session_key).update(
            expire_date=timezone.now() - timedelta(seconds=1))
        self.assertEqual(client.get('/api/auth/session/').status_code, 401)

    def test_admin_ignores_role_permission_values(self):
        Role.objects.filter(pk=self.admin.role_link_id).update(permissions={'project.create': False})
        client, token = self.client_for('admin')
        response = client.post('/api/projects/', {'project_name': 'Allowed'}, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(Project.objects.filter(project_name='Allowed').exists())

    def test_task_relationship_outside_project_is_rejected(self):
        client, token = self.client_for('manager')
        response = client.post('/api/tasks/', {
            'project': str(self.project.pk), 'assigned_to': str(self.admin.pk),
            'Task_Name': 'Invalid assignee', 'description': 'Work',
        }, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Task.objects.filter(Task_Name='Invalid assignee').exists())

    def test_explicit_crud_methods_and_commit_notifications(self):
        client, token = self.client_for('admin')

        def write(method, url, payload=None):
            return getattr(client, method)(url, payload, format='json', HTTP_X_CSRFTOKEN=token)

        with patch('apps.notifications.email_outbox.mail_pool.submit') as submit_mail, \
             self.captureOnCommitCallbacks(execute=True):
            resources = [
                ('users', {
                    'user_name': 'cruduser', 'employee_id': 'C1', 'first_name': 'Crud',
                    'last_name': 'User', 'email': 'crud@tachyonautomations.com',
                    'password': 'Another-strong-password-123', 'date_of_joining': '2025-01-01',
                    'role_link': str(self.developer.role_link_id), 'department': 'Software',
                    'employment_type': 'full_time',
                }, {'first_name': 'Updated'}),
                ('projects', {'project_name': 'Explicit methods'}, {'description': 'Updated'}),
            ]
            created = {}
            for name, payload, change in resources:
                collection = f'/api/{name}/'
                response = write('post', collection, payload)
                self.assertEqual(response.status_code, 201, response.data)
                detail = f"{collection}{response.data['id']}/"
                created[name] = (detail, payload)
                self.assertEqual(client.get(collection).status_code, 200)
                self.assertEqual(client.get(detail).status_code, 200)
                self.assertEqual(write('put', detail, payload).status_code, 200)
                self.assertEqual(write('patch', detail, change).status_code, 200)

            project_id = created['projects'][0].split('/')[-2]
            user_id = created['users'][0].split('/')[-2]
            self.assertEqual(write('patch', created['projects'][0], {'team_members': [user_id]}).status_code, 200)
            nested = [
                ('milestones', {'project': project_id, 'name': 'Delivery', 'due_date': '2026-12-01'}, {'description': 'Updated'}),
                ('features', None, {'description': 'Updated'}),
                ('tasks', {'project': project_id, 'assigned_to': user_id, 'Task_Name': 'Ship', 'description': 'Work'}, {'description': 'Updated'}),
            ]
            for name, payload, change in nested:
                if name == 'features':
                    payload = {'Milestone': created['milestones'][0].split('/')[-2], 'feature_name': 'Feature'}
                collection = f'/api/{name}/'
                response = write('post', collection, payload)
                self.assertEqual(response.status_code, 201, response.data)
                detail = f"{collection}{response.data['id']}/"
                created[name] = (detail, payload)
                self.assertEqual(client.get(collection).status_code, 200)
                self.assertEqual(client.get(detail).status_code, 200)
                self.assertEqual(write('put', detail, payload).status_code, 200)
                self.assertEqual(write('patch', detail, change).status_code, 200)

            for name in ('features', 'milestones', 'tasks', 'projects'):
                self.assertEqual(write('delete', created[name][0]).status_code, 204)
            # User delete is a soft-delete (sets account_status=inactive) — returns 200 + body
            user_resp = write('delete', created['users'][0])
            self.assertEqual(user_resp.status_code, 200)
            self.assertEqual(user_resp.data['account_status'], 'inactive')

        self.assertEqual(submit_mail.call_count, 2)
        self.assertEqual(EmailOutbox.objects.filter(kind=EmailOutbox.ACCOUNT_CREATED).count(), 1)
        self.assertEqual(EmailOutbox.objects.filter(kind=EmailOutbox.TASK_ASSIGNED).count(), 1)
        self.assertNotIn('temporary_password', EmailOutbox.objects.get(
            kind=EmailOutbox.ACCOUNT_CREATED).payload)

    def test_create_rolls_back_when_audit_registration_fails(self):
        client, token = self.client_for('admin')
        client.raise_request_exception = False
        with patch('apps.core.views.LogService.log_audit_event', side_effect=RuntimeError('audit unavailable')):
            response = client.post('/api/projects/', {'project_name': 'Rollback target'},
                                   format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 500)
        self.assertFalse(Project.objects.filter(project_name='Rollback target').exists())

    def test_audit_is_written_after_commit_and_unknown_object_is_404(self):
        client, token = self.client_for('admin')
        with self.captureOnCommitCallbacks(execute=True):
            response = client.post('/api/projects/', {'project_name': 'Audited'},
                                   format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(AuditLog.objects.filter(entity_id=response.data['id'],
                                                entity_type='project', action='created').exists())
        self.assertEqual(client.get('/api/projects/00000000-0000-0000-0000-000000000000/').status_code, 404)

    def test_full_project_creation_with_nested_relations(self):
        client, token = self.client_for('manager')
        payload = {
            'project_name': 'Nested', 'start_date': '2026-10-01',
            'end_date': '2026-12-31', 'team_members': [str(self.developer.pk)],
            'sprints': [{'client_id': 'sprint-1', 'Sprint_Name': 'Sprint 1', 'Sprint_start_date': '2026-10-01',
                         'Sprint_end_date': '2026-10-14'}],
            'milestones': [{'name': 'MVP', 'due_date': '2026-11-01', 'features': [
                {'feature_name': 'Login', 'tasks': [
                    {'Task_Name': 'API', 'description': 'Build API',
                     'assigned_to': str(self.developer.pk), 'sprint_ref': 'sprint-1',
                     'temp_id': 'api'},
                    {'Task_Name': 'UI', 'description': 'Build UI',
                     'assigned_to': str(self.developer.pk), 'temp_id': 'ui'}]}]}],
            'dependencies': [{'task_ref': 'ui', 'depends_on_ref': 'api',
                              'description': 'Wait for API'}],
        }
        with patch('apps.notifications.email_outbox.mail_pool.submit') as submit_mail:
            with self.captureOnCommitCallbacks(execute=True):
                response = client.post('/api/projects/', payload, format='json', HTTP_X_CSRFTOKEN=token)
            self.assertEqual(response.status_code, 201, response.data)
            self.assertEqual(submit_mail.call_count, 2)
        project = Project.objects.get(pk=response.data['id'])
        self.assertEqual(project.team_members.count(), 1)
        self.assertEqual(Milestones.objects.filter(project=project).count(), 1)
        self.assertEqual(Milestone_Features.objects.filter(Milestone__project=project).count(), 1)
        self.assertEqual(Sprint.objects.filter(project=project).count(), 1)
        self.assertEqual(Task.objects.filter(project=project, feature__isnull=False).count(), 2)
        self.assertEqual(TaskDependency.objects.filter(task__project=project, depends_on__isnull=False).count(), 1)
        self.assertEqual(len(response.data['tasks']), 2)
        self.assertTrue(AuditLog.objects.filter(entity_id=project.pk, action='created').exists())

    def test_nested_project_rejects_empty_milestone_and_bad_sprint(self):
        client, token = self.client_for('manager')
        payload = {'project_name': 'Invalid nested', 'team_members': [str(self.developer.pk)],
                   'milestones': [{'name': 'Empty', 'due_date': '2026-11-01', 'features': []}]}
        response = client.post('/api/projects/', payload, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Project.objects.filter(project_name='Invalid nested').exists())
        payload['milestones'][0]['features'] = [{'feature_name': 'Feature', 'tasks': [
            {'Task_Name': 'Task', 'description': 'Work', 'assigned_to': str(self.developer.pk),
             'sprint_ref': 'missing'}]}]
        response = client.post('/api/projects/', payload, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Project.objects.filter(project_name='Invalid nested').exists())

    def test_nested_project_rejects_invalid_dependency_and_permission(self):
        client, token = self.client_for('manager')
        payload = {'project_name': 'Bad dependency', 'tasks': [
            {'Task_Name': 'Task', 'description': 'Work', 'assigned_to': str(self.pm.pk),
             'temp_id': 'one'}],
            'dependencies': [{'task_ref': 'one', 'depends_on_ref': 'one',
                              'description': 'Impossible'}]}
        response = client.post('/api/projects/', payload, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Project.objects.filter(project_name='Bad dependency').exists())
        developer_client, developer_token = self.client_for('developer')
        response = developer_client.post('/api/projects/', {'project_name': 'Forbidden'},
                                         format='json', HTTP_X_CSRFTOKEN=developer_token)
        self.assertEqual(response.status_code, 403)

    def test_nested_failure_rolls_back_project_and_notices(self):
        client, token = self.client_for('manager')
        payload = {'project_name': 'Rolled back', 'team_members': [str(self.developer.pk)],
                   'tasks': [{'Task_Name': 'Task', 'description': 'Work',
                              'assigned_to': str(self.developer.pk)}]}
        client.raise_request_exception = False
        with patch('apps.tasks.services.Task.objects.bulk_create', side_effect=RuntimeError('failed')):
            with self.captureOnCommitCallbacks(execute=True) as callbacks:
                response = client.post('/api/projects/', payload, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 500)
        self.assertFalse(Project.objects.filter(project_name='Rolled back').exists())
        self.assertEqual(callbacks, [])

    def test_project_creation_with_sprint_and_standalone_task(self):
        client, token = self.client_for('manager')
        response = client.post('/api/projects/', {
            'project_name': 'Sprint only', 'team_members': [str(self.developer.pk)],
            'sprints': [{'client_id': 'first', 'Sprint_Name': 'First', 'Sprint_start_date': '2026-10-01',
                         'Sprint_end_date': '2026-10-14'}],
            'tasks': [{'Task_Name': 'Setup', 'description': 'Prepare repository',
                       'assigned_to': str(self.developer.pk), 'sprint_ref': 'first'}],
        }, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 201, response.data)
        task = Task.objects.get(project_id=response.data['id'])
        self.assertIsNotNone(task.sprint_id)
        self.assertIsNone(task.feature_id)

    def test_project_creation_rejects_invalid_user_and_dates(self):
        client, token = self.client_for('manager')
        payload = {'project_name': 'Invalid data', 'start_date': '2026-12-01',
                   'end_date': '2026-11-01'}
        response = client.post('/api/projects/', payload, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 400)
        payload = {'project_name': 'Invalid data', 'tasks': [
            {'Task_Name': 'Task', 'description': 'Work', 'assigned_to': str(self.admin.pk)}]}
        response = client.post('/api/projects/', payload, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Project.objects.filter(project_name='Invalid data').exists())

    def test_project_creation_rejects_circular_dependencies(self):
        client, token = self.client_for('manager')
        payload = {'project_name': 'Circular', 'tasks': [
            {'Task_Name': 'A', 'description': 'A', 'assigned_to': str(self.pm.pk), 'temp_id': 'a'},
            {'Task_Name': 'B', 'description': 'B', 'assigned_to': str(self.pm.pk), 'temp_id': 'b'}],
            'dependencies': [
                {'task_ref': 'a', 'depends_on_ref': 'b', 'description': 'Wait'},
                {'task_ref': 'b', 'depends_on_ref': 'a', 'description': 'Wait'}]}
        response = client.post('/api/projects/', payload, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Project.objects.filter(project_name='Circular').exists())

    def test_sprint_crud_uses_project_permission_and_scope(self):
        client, token = self.client_for('manager')
        payload = {'project': str(self.project.pk), 'Sprint_Name': 'Iteration 1',
                   'Sprint_start_date': '2026-10-01', 'Sprint_end_date': '2026-10-14',
                   'team_members': [str(self.developer.pk)]}
        response = client.post('/api/sprints/', payload, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 201, response.data)
        url = f"/api/sprints/{response.data['id']}/"
        self.assertEqual(client.get('/api/sprints/').status_code, 200)
        self.assertEqual(client.get(url).status_code, 200)
        response = client.patch(url, {'Sprint_Name': 'Iteration 2'},
                                format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['Sprint_Name'], 'Iteration 2')
        developer_client, developer_token = self.client_for('developer')
        self.assertEqual(developer_client.delete(url, HTTP_X_CSRFTOKEN=developer_token).status_code, 403)
        self.assertEqual(client.delete(url, HTTP_X_CSRFTOKEN=token).status_code, 204)
        self.assertFalse(Sprint.objects.filter(pk=response.data['id']).exists())

    def test_dependency_crud_uses_dependency_permission_and_project_scope(self):
        permissions = dict(self.pm.role_link.permissions)
        permissions['Dependencies'] = {'View': True, 'Create': True, 'Edit': True, 'Delete': True}
        self.pm.role_link.permissions = permissions
        self.pm.role_link.save(update_fields=['permissions'])
        first = Task.objects.create(project=self.project, assigned_to=self.developer,
                                    Task_Name='First', description='First')
        second = Task.objects.create(project=self.project, assigned_to=self.developer,
                                     Task_Name='Second', description='Second')
        client, token = self.client_for('manager')
        response = client.post('/api/dependencies/', {
            'task': str(second.pk), 'depends_on': str(first.pk), 'description': 'Wait for first',
        }, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 201, response.data)
        url = f"/api/dependencies/{response.data['id']}/"
        self.assertEqual(client.get('/api/dependencies/').status_code, 200)
        self.assertEqual(client.get(url).status_code, 200)
        response = client.put(url, {'task': str(second.pk), 'depends_on': str(first.pk),
                                    'description': 'Still waiting', 'status': 'in_progress'},
                              format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 200, response.data)
        response = client.patch(url, {'status': 'completed'}, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 200, response.data)
        developer_client, developer_token = self.client_for('developer')
        self.assertEqual(developer_client.delete(url, HTTP_X_CSRFTOKEN=developer_token).status_code, 403)
        self.assertEqual(client.delete(url, HTTP_X_CSRFTOKEN=token).status_code, 204)
        self.assertFalse(TaskDependency.objects.filter(pk=response.data['id']).exists())

    def test_dependency_rejects_cross_project_and_cycle(self):
        permissions = dict(self.pm.role_link.permissions)
        permissions['Dependencies'] = {'View': True, 'Create': True, 'Edit': True, 'Delete': True}
        self.pm.role_link.permissions = permissions
        self.pm.role_link.save(update_fields=['permissions'])
        other_project = Project.objects.create(project_name='Other', created_by=self.pm)
        first = Task.objects.create(project=self.project, assigned_to=self.pm,
                                    Task_Name='First', description='First')
        second = Task.objects.create(project=self.project, assigned_to=self.pm,
                                     Task_Name='Second', description='Second')
        external = Task.objects.create(project=other_project, assigned_to=self.pm,
                                       Task_Name='External', description='External')
        client, token = self.client_for('manager')
        base = {'task': str(second.pk), 'description': 'Wait'}
        response = client.post('/api/dependencies/', {**base, 'depends_on': str(external.pk)},
                               format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 400)
        response = client.post('/api/dependencies/', {**base, 'depends_on': str(first.pk)},
                               format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 201, response.data)
        response = client.post('/api/dependencies/', {**base, 'depends_on': str(first.pk)},
                               format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 400)
        response = client.post('/api/dependencies/', {
            'task': str(first.pk), 'depends_on': str(second.pk), 'description': 'Cycle',
        }, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 400)

    def test_sprint_and_dependency_permission_still_require_project_scope(self):
        other_project = Project.objects.create(project_name='Private', created_by=self.pm)
        sprint = Sprint.objects.create(project=other_project, Sprint_Name='Private sprint',
                                       Sprint_start_date=date(2026, 10, 1),
                                       Sprint_end_date=date(2026, 10, 14))
        task = Task.objects.create(project=other_project, assigned_to=self.pm,
                                   Task_Name='Private task', description='Private')
        dependency = TaskDependency.objects.create(task=task, description='Private dependency')
        permissions = dict(self.developer.role_link.permissions)
        permissions['Projects'] = {'View': True, 'Create': True, 'Edit': True, 'Delete': True}
        permissions['Dependencies'] = {'View': True, 'Create': True, 'Edit': True, 'Delete': True}
        self.developer.role_link.permissions = permissions
        self.developer.role_link.save(update_fields=['permissions'])
        client, token = self.client_for('developer')
        self.assertEqual(client.get(f'/api/sprints/{sprint.pk}/').status_code, 404)
        self.assertEqual(client.delete(f'/api/sprints/{sprint.pk}/', HTTP_X_CSRFTOKEN=token).status_code, 404)
        self.assertEqual(client.get(f'/api/dependencies/{dependency.pk}/').status_code, 404)
        self.assertEqual(client.delete(f'/api/dependencies/{dependency.pk}/', HTTP_X_CSRFTOKEN=token).status_code, 404)
        response = client.post('/api/sprints/', {
            'project': str(other_project.pk), 'Sprint_Name': 'Attempt',
            'Sprint_start_date': '2026-10-01', 'Sprint_end_date': '2026-10-14',
        }, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 403)
        response = client.post('/api/dependencies/', {
            'task': str(task.pk), 'description': 'Attempt',
        }, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 403)

    def test_bulk_sprint_generation_scales_and_reports_item_errors(self):
        client, token = self.client_for('manager')
        query_counts = {}
        for count in (10, 100, 200):
            payload = {'sprints': [
                {'client_id': f'{count}-{index}', 'Sprint_Name': f'Sprint {index}',
                 'Sprint_start_date': str(date(2026, 10, 1) + timedelta(days=index * 14)),
                 'Sprint_end_date': str(date(2026, 10, 14) + timedelta(days=index * 14)),
                 'team_members': [str(self.developer.pk)]}
                for index in range(count)
            ]}
            with CaptureQueriesContext(connection) as queries:
                response = client.post(f'/api/projects/{self.project.pk}/sprints/bulk/',
                                       payload, format='json', HTTP_X_CSRFTOKEN=token)
            self.assertEqual(response.status_code, 201, response.data)
            self.assertEqual(len(response.data), count)
            query_counts[count] = len(queries)
        self.assertEqual(Sprint.objects.filter(project=self.project).count(), 310)
        self.assertEqual(Sprint.team_members.through.objects.filter(sprint__project=self.project).count(), 310)
        self.assertLessEqual(query_counts[200], query_counts[10] + 8, query_counts)

        invalid = {'sprints': [
            {'client_id': f'bad-{index}', 'Sprint_Name': f'Bad {index}',
             'Sprint_start_date': '2026-10-14', 'Sprint_end_date':
             '2026-10-01' if index == 72 else '2026-10-28'}
            for index in range(100)
        ]}
        response = client.post(f'/api/projects/{self.project.pk}/sprints/bulk/',
                               invalid, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 400)
        self.assertIn('72', str(response.data))
        self.assertEqual(Sprint.objects.filter(project=self.project).count(), 310)

    def test_bulk_sprint_write_failure_rolls_back(self):
        client, token = self.client_for('manager')
        client.raise_request_exception = False
        original_bulk_create = Sprint.objects.bulk_create

        def write_then_fail(items, **kwargs):
            original_bulk_create(items, **kwargs)
            raise RuntimeError('insert failed after write')

        payload = {'sprints': [{
            'client_id': f'rollback-{index}', 'Sprint_Name': f'Sprint {index}',
            'Sprint_start_date': '2026-10-01', 'Sprint_end_date': '2026-10-14',
        } for index in range(10)]}
        with patch('apps.sprints.services.Sprint.objects.bulk_create', side_effect=write_then_fail):
            response = client.post(f'/api/projects/{self.project.pk}/sprints/bulk/',
                                   payload, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 500)
        self.assertFalse(Sprint.objects.filter(project=self.project).exists())

    def test_project_bulk_tasks_dependencies_and_query_growth(self):
        client, token = self.client_for('manager')
        query_counts = {}
        for count in (10, 200):
            payload = {
                'project_name': f'Bulk {count}',
                'sprints': [{'client_id': f'sprint-{index}', 'Sprint_Name': f'Sprint {index}',
                             'Sprint_start_date': '2026-10-01',
                             'Sprint_end_date': '2026-10-14'}
                            for index in range(count // 2)],
                'tasks': [{'temp_id': f'task-{index}', 'Task_Name': f'Task {index}',
                           'description': 'Work', 'assigned_to': str(self.pm.pk),
                           'sprint_ref': f'sprint-{index // 2}'}
                          for index in range(count)],
                'dependencies': [{'task_ref': f'task-{index}',
                                  'depends_on_ref': f'task-{index - 1}',
                                  'description': 'Previous task'}
                                 for index in range(1, count)],
            }
            with CaptureQueriesContext(connection) as queries:
                response = client.post('/api/projects/', payload, format='json',
                                       HTTP_X_CSRFTOKEN=token)
            self.assertEqual(response.status_code, 201, response.data)
            self.assertEqual(len(response.data['tasks']), count)
            self.assertEqual(len(response.data['dependencies']), count - 1)
            self.assertEqual(len(response.data['references']['sprints']), count // 2)
            query_counts[count] = len(queries)
        self.assertLessEqual(query_counts[200], query_counts[10] + 16, query_counts)

    def test_dependency_database_constraints(self):
        first = Task.objects.create(project=self.project, assigned_to=self.pm,
                                    Task_Name='First', description='First')
        second = Task.objects.create(project=self.project, assigned_to=self.pm,
                                     Task_Name='Second', description='Second')
        TaskDependency.objects.create(task=second, depends_on=first, description='Wait')
        with self.assertRaises(IntegrityError), transaction.atomic():
            TaskDependency.objects.create(task=second, depends_on=first, description='Duplicate')
        with self.assertRaises(IntegrityError), transaction.atomic():
            TaskDependency.objects.create(task=first, depends_on=first, description='Self')

    def test_list_filters_respect_scope_and_combine_before_pagination(self):
        other_project = Project.objects.create(project_name='Hidden', created_by=self.admin)
        other_task = Task.objects.create(project=other_project, assigned_to=self.admin,
                                         Task_Name='Hidden task', description='Secret')
        task = Task.objects.create(project=self.project, assigned_to=self.developer,
                                   Task_Name='Login API', description='Authentication',
                                   Due_Date=date(2026, 10, 1))
        milestone = Milestones.objects.create(project=self.project, name='Release',
                                              due_date=date(2026, 10, 31),
                                              created_by=self.pm, updated_by=self.pm)
        feature = Milestone_Features.objects.create(Milestone=milestone,
                                                     feature_name='Login', description='Auth')
        task.feature = feature
        task.save(update_fields=['feature'])
        sprint = Sprint.objects.create(project=self.project, Sprint_Name='October',
                                       Sprint_start_date=date(2026, 10, 1),
                                       Sprint_end_date=date(2026, 10, 14))
        task.sprint = sprint
        task.save(update_fields=['sprint'])
        dependency = TaskDependency.objects.create(task=task, depends_on=None,
                                                    description='Prepare login')
        client, _ = self.client_for('manager')
        admin_client, _ = self.client_for('admin')
        cases = (
            ('projects', {'search': 'DEMO'}, self.project.pk),
            ('tasks', {'project': str(self.project.pk), 'sprint': str(sprint.pk),
                       'feature': str(feature.pk), 'milestone': str(milestone.pk),
                       'assigned_to': str(self.developer.pk), 'status': 'open',
                       'due_date_from': '2026-10-01', 'due_date_to': '2026-10-01'}, task.pk),
            ('features', {'project': str(self.project.pk), 'status': 'pending',
                          'priority': 'medium', 'search': 'LOGIN'}, feature.pk),
            ('milestones', {'project': str(self.project.pk), 'due_date_to': '2026-10-31'},
             milestone.pk),
            ('sprints', {'project': str(self.project.pk), 'status': 'Pending',
                         'start_date_from': '2026-10-01'}, sprint.pk),
            ('dependencies', {'project': str(self.project.pk),
                              'source_task': str(task.pk), 'status': 'started'}, dependency.pk),
            ('users', {'role': str(self.developer.role_link_id), 'project': str(self.project.pk),
                       'is_active': 'true', 'search': 'DEV'}, self.developer.pk),
        )
        for resource, filters, expected in cases:
            with self.subTest(resource=resource):
                response = (admin_client if resource == 'dependencies' else client).get(
                    f'/api/{resource}/', filters)
                self.assertEqual(response.status_code, 200, response.data)
                self.assertEqual(response.data['count'], 1)
                self.assertEqual(response.data['results'][0]['id'], str(expected))
        for resource in ('projects', 'tasks', 'features', 'milestones', 'sprints',
                         'dependencies', 'users'):
            with self.subTest(resource=resource, invalid=True):
                authorized_client = admin_client if resource == 'dependencies' else client
                self.assertEqual(authorized_client.get(f'/api/{resource}/',
                                            {'ordering': 'nonexistent'}).status_code, 400)
        self.assertEqual(client.get('/api/tasks/', {'project': str(other_project.pk)}).data['count'], 0)
        self.assertEqual(client.get('/api/tasks/', {'project': str(other_project.pk),
                                                     'search': other_task.Task_Name}).data['count'], 0)
        self.assertEqual(client.get('/api/tasks/', {'due_date_from': 'invalid'}).status_code, 400)
        self.assertEqual(client.get('/api/users/', {'is_active': 'nope'}).status_code, 400)

    def test_relationship_filters_ordering_and_filtered_pagination(self):
        department = Department.objects.create(name='Engineering')
        self.pm.department_link = department
        self.pm.save(update_fields=['department_link'])
        self.project.departments.add(department)
        self.project.project_managers.add(self.pm)
        first = Task.objects.create(project=self.project, assigned_to=self.pm,
                                    Task_Name='First', description='Work')
        second = Task.objects.create(project=self.project, assigned_to=self.pm,
                                     Task_Name='Second', description='Work')
        TaskDependency.objects.create(task=second, depends_on=first, description='Wait')
        client, _ = self.client_for('manager')
        admin_client, _ = self.client_for('admin')
        response = client.get('/api/projects/', {'manager': str(self.pm.pk),
                                                  'department': str(department.pk)})
        self.assertEqual(response.data['count'], 1)
        response = client.get('/api/users/', {'department': str(department.pk)})
        self.assertEqual(response.data['count'], 1)
        response = admin_client.get('/api/dependencies/', {'source_task': str(second.pk),
                                                            'target_task': str(first.pk)})
        self.assertEqual(response.data['count'], 1)
        response = client.get('/api/tasks/', {'project': str(self.project.pk),
                                               'ordering': '-Task_Name', 'page_size': 1})
        self.assertEqual(response.data['count'], 2)
        self.assertEqual(response.data['results'][0]['id'], str(second.pk))
        self.assertIsNotNone(response.data['next'])
        self.assertEqual(client.get('/api/projects/', {'manager': 'bad-id'}).status_code, 400)
