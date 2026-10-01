from datetime import date
from importlib import import_module
from types import SimpleNamespace

from django.apps import apps as django_apps
from django.contrib.auth.hashers import make_password
from django.db import connection
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from api.models import ApiRequestLog, AuditLog, Project, Role, UserData


@override_settings(SESSION_ENGINE='django.contrib.sessions.backends.db')
class RolePermissionTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin_role = Role.objects.create(name='admin', permissions={'Projects': {'Create': False}})
        cls.team_role = Role.objects.create(name='Team Lead', permissions={
            'Projects': {'View': True},
            'Tasks': {'View': True},
            'Roles & permissions': {'View': True},
        })
        cls.admin = cls.user('rbacadmin', cls.admin_role)
        cls.member = cls.user('lead', cls.team_role)
        cls.project = Project.objects.create(project_name='Team project', created_by=cls.admin)
        cls.project.team_members.add(cls.member)
        cls.other_project = Project.objects.create(project_name='Other project', created_by=cls.admin)

    @staticmethod
    def user(name, role):
        return UserData.objects.create(
            user_name=name, employee_id=name, first_name=name, last_name='User',
            email=f'{name}@example.com', password=make_password('Strong-password-123'),
            date_of_joining=date(2025, 1, 1), role_link=role,
        )

    def client_for(self, name):
        client = APIClient(enforce_csrf_checks=True)
        token = client.get('/api/auth/csrf/').data['csrfToken']
        response = client.post('/api/auth/login/', {
            'identifier': name, 'password': 'Strong-password-123',
        }, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 200, response.data)
        return client, response.data['csrfToken']

    def test_admin_override_and_role_crud(self):
        client, token = self.client_for('rbacadmin')
        response = client.post('/api/projects/', {'project_name': 'Allowed'},
                               format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(client.get('/api/roles/schema/').data['TeamStatus'] == ['View'])
        response = client.post('/api/roles/', {
            'name': 'Reviewer', 'permissions': {'Tasks': {'View': True}},
        }, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 201, response.data)
        url = f"/api/roles/{response.data['id']}/"
        self.assertEqual(client.get(url).status_code, 200)
        self.assertEqual(client.put(url, {
            'name': 'Reviewer', 'permissions': {'Tasks': {'View': True, 'Edit': True}},
        }, format='json', HTTP_X_CSRFTOKEN=token).status_code, 200)
        self.assertEqual(client.patch(url, {'description': 'Reviews tasks'},
                                      format='json', HTTP_X_CSRFTOKEN=token).status_code, 200)
        self.assertEqual(client.delete(url, HTTP_X_CSRFTOKEN=token).status_code, 204)
        self.assertEqual(client.delete(f'/api/roles/{self.admin_role.pk}/', HTTP_X_CSRFTOKEN=token).status_code, 403)

    def test_custom_role_permissions_and_project_scope(self):
        client, token = self.client_for('lead')
        self.assertEqual(client.get('/api/projects/').status_code, 200)
        self.assertEqual(client.get(f'/api/projects/{self.project.pk}/').status_code, 200)
        self.assertEqual(client.get(f'/api/projects/{self.other_project.pk}/').status_code, 404)
        self.assertEqual(client.post('/api/projects/', {'project_name': 'Denied'},
                                     format='json', HTTP_X_CSRFTOKEN=token).status_code, 403)
        self.assertEqual(client.patch(f'/api/projects/{self.project.pk}/', {'description': 'Denied'},
                                      format='json', HTTP_X_CSRFTOKEN=token).status_code, 403)
        self.assertEqual(client.delete(f'/api/projects/{self.project.pk}/', HTTP_X_CSRFTOKEN=token).status_code, 403)
        self.assertEqual(client.get('/api/roles/').status_code, 200)
        self.assertEqual(client.post('/api/roles/', {'name': 'Forbidden'},
                                     format='json', HTTP_X_CSRFTOKEN=token).status_code, 403)

    def test_permission_changes_apply_to_existing_session(self):
        client, _ = self.client_for('lead')
        self.assertEqual(client.get('/api/projects/').status_code, 200)
        Role.objects.filter(pk=self.team_role.pk).update(permissions={'Projects': {'View': False}})
        self.assertEqual(client.get('/api/projects/').status_code, 403)
        Role.objects.filter(pk=self.team_role.pk).update(permissions={'Projects': {'View': True}})
        self.assertEqual(client.get('/api/projects/').status_code, 200)

    def test_delegated_role_manager_cannot_escalate(self):
        Role.objects.filter(pk=self.team_role.pk).update(permissions={
            'Projects': {'View': True},
            'Roles & permissions': {'View': True, 'Create': True, 'Edit': True},
        })
        client, token = self.client_for('lead')
        self.assertEqual(client.post('/api/roles/', {
            'name': 'Escalation', 'permissions': {'Projects': {'Delete': True}},
        }, format='json', HTTP_X_CSRFTOKEN=token).status_code, 403)
        response = client.post('/api/roles/', {
            'name': 'Reader', 'permissions': {'Projects': {'View': True}},
        }, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(client.patch(f"/api/roles/{response.data['id']}/", {
            'permissions': {'Projects': {'Delete': True}},
        }, format='json', HTTP_X_CSRFTOKEN=token).status_code, 403)
        self.assertEqual(client.post('/api/roles/', {
            'name': 'Administrator', 'permissions': {},
        }, format='json', HTTP_X_CSRFTOKEN=token).status_code, 403)
        self.assertEqual(client.post('/api/roles/', {
            'name': 'Unknown', 'permissions': {'Fake': {'View': True}},
        }, format='json', HTTP_X_CSRFTOKEN=token).status_code, 400)

    def test_unassigned_role_has_no_implicit_permissions(self):
        user = self.user('norole', None)
        client, _ = self.client_for(user.user_name)
        self.assertEqual(client.get('/api/projects/').status_code, 403)

    def test_custom_role_grants_each_project_operation(self):
        Role.objects.filter(pk=self.team_role.pk).update(permissions={
            'Projects': {'View': True, 'Create': True, 'Edit': True, 'Delete': True},
        })
        client, token = self.client_for('lead')
        response = client.post('/api/projects/', {'project_name': 'Lead project'},
                               format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 201, response.data)
        url = f"/api/projects/{response.data['id']}/"
        self.assertEqual(client.put(url, {'project_name': 'Renamed'},
                                    format='json', HTTP_X_CSRFTOKEN=token).status_code, 200)
        self.assertEqual(client.delete(url, HTTP_X_CSRFTOKEN=token).status_code, 204)
        self.assertEqual(client.get(f'/api/projects/{self.other_project.pk}/').status_code, 404)

    def test_non_admin_cannot_assign_administrator_role(self):
        Role.objects.filter(pk=self.team_role.pk).update(permissions={
            'User Management': {'Create': True},
        })
        client, token = self.client_for('lead')
        response = client.post('/api/users/', {
            'user_name': 'elevated', 'employee_id': 'E1', 'first_name': 'Elevated',
            'last_name': 'User', 'email': 'elevated@tachyonautomations.com',
            'password': 'Another-strong-password-123', 'date_of_joining': '2025-01-01',
            'role_link': str(self.admin_role.pk), 'department': 'Software',
            'employment_type': 'full_time', 'manager': str(self.member.pk),
        }, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 403)
        self.assertFalse(UserData.objects.filter(user_name='elevated').exists())

    def test_legacy_permission_conversion_preserves_supported_values(self):
        canonicalize = import_module('api.migrations.0004_canonical_role_permissions').canonicalize
        self.assertEqual(canonicalize({
            'project.read': True,
            'Projects': {'View': False, 'Edit': True},
            'TeamStatus': {'View': True, 'Edit': True},
            'Unknown': {'View': True},
        }), {
            'Projects': {'View': False, 'Edit': True},
            'TeamStatus': {'View': True},
        })

    def test_request_id_and_role_permission_change_are_audited(self):
        client, token = self.client_for('rbacadmin')
        response = client.get('/api/roles/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(ApiRequestLog.objects.filter(request_id=response['X-Request-ID']).exists())
        with self.captureOnCommitCallbacks(execute=True):
            response = client.patch(f'/api/roles/{self.team_role.pk}/', {
                'permissions': {'Projects': {'View': False}},
            }, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 200, response.data)
        event = AuditLog.objects.filter(entity_type='role', entity_id=self.team_role.pk,
                                        action='updated').first()
        self.assertIsNotNone(event)
        self.assertEqual(event.old_values['permissions']['Projects']['View'], True)
        self.assertEqual(event.new_values['permissions']['Projects']['View'], False)

    def test_migration_backfills_existing_roles_without_granting_custom_role(self):
        migration = import_module('api.migrations.0004_canonical_role_permissions')
        manager = Role.objects.create(name='Project Manager')
        custom = Role.objects.create(name='Custom Empty')
        legacy = Role.objects.create(name='Legacy', permissions={'project.read': True})
        migration.migrate_permissions(django_apps, SimpleNamespace(connection=connection))
        manager.refresh_from_db()
        custom.refresh_from_db()
        legacy.refresh_from_db()
        self.assertTrue(manager.permissions['Projects']['Create'])
        self.assertEqual(custom.permissions, {})
        self.assertEqual(legacy.permissions, {'Projects': {'View': True}})
