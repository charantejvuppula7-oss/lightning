from importlib import import_module
from types import SimpleNamespace
from datetime import date

from django.apps import apps
from django.db import connection
from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIClient

from api.models import Project, Role, Skill, Task, UserData
from apps.roles.permissions import MODULE_ACTIONS, canonical_permissions, has_permission, permission_value


class PermissionPolicyTests(SimpleTestCase):
    def test_exact_modules_and_widget_actions(self):
        self.assertEqual(set(MODULE_ACTIONS), {'Tasks', 'Features', 'Milestones', 'Reports', 'Projects', 'Documents',
            'Dependencies', 'User Management', 'Roles & permissions', 'Department Managment', 'TeamWorLoad',
            'ProjectJourney', 'ProjectPerformanceGraph', 'MilestoneMap', 'TeamStatus', 'recentActvities'})
        for widget in ('TeamWorLoad', 'ProjectJourney', 'ProjectPerformanceGraph', 'MilestoneMap', 'TeamStatus', 'recentActvities'):
            self.assertEqual(MODULE_ACTIONS[widget], ('View',))

    def test_listed_permissions_require_true_and_unlisted_modules_are_open(self):
        for module, actions in MODULE_ACTIONS.items():
            for action in actions:
                self.assertFalse(permission_value({}, module, action))
                self.assertFalse(permission_value({module: {action: False}}, module, action))
                self.assertFalse(permission_value({module: {action: 'true'}}, module, action))
                self.assertTrue(permission_value({module: {action: True}}, module, action))
        for module in ('Chat', 'Calendar', 'Approvals', 'Dashboard', 'Audit Logs', 'API Logs', 'Database Explorer'):
            for action in ('View', 'Create', 'Edit', 'Delete'):
                self.assertTrue(permission_value({module: {action: False}}, module, action))
        self.assertFalse(permission_value({}, 'tasks', 'view'))
        self.assertTrue(permission_value({'Tasks': {'View': True}}, 'task', 'read'))
        self.assertFalse(permission_value({'TeamStatus': {'Edit': True}}, 'TeamStatus', 'Edit'))
        self.assertNotIn('Dashboard', canonical_permissions({'Dashboard': {'View': False}}))

    def test_open_features_still_require_an_active_authenticated_account(self):
        for authenticated, status in ((False, 'active'), (True, 'inactive')):
            actor = SimpleNamespace(is_authenticated=authenticated, account_status=status, role_link_id=None)
            self.assertFalse(has_permission(actor, 'Chat', 'View'))


class RoleAccessTests(TestCase):
    def setUp(self):
        self.role = Role.objects.create(name='Policy member', permissions={
            'Roles & permissions': {'View': True, 'Edit': True, 'Create': True},
            'Documents': {'View': True, 'Delete': False}, 'Tasks': {'View': False},
            'Dashboard': {'View': False}, 'Audit Logs': {'View': False},
        })
        self.user = UserData.objects.create(user_name='policy_member', employee_id='POL1', first_name='Policy',
            last_name='Member', email='policy@example.com', password='unused', date_of_joining=date(2025, 1, 1), role_link=self.role)
        self.project = Project.objects.create(project_name='Assigned project', created_by=self.user)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_unlisted_features_are_accessible_but_listed_resources_remain_denied(self):
        for path in ('/api/api-logs/', '/api/audit-logs/', '/api/approvals/', '/api/overview/',
                     f'/api/projects/{self.project.pk}/chat/messages/'):
            response = self.client.get(path)
            self.assertEqual(response.status_code, 200, (path, response.data))
        self.assertEqual(self.client.get('/api/tasks/').status_code, 403)
        schema = self.client.get('/api/roles/schema/')
        self.assertEqual(schema.status_code, 200)
        self.assertEqual(set(schema.data), set(MODULE_ACTIONS))
        role = self.client.get(f'/api/roles/{self.role.pk}/')
        self.assertEqual(set(role.data['permissions']), set(MODULE_ACTIONS))

    def test_database_explorer_cannot_bypass_listed_permissions_or_grant_new_privileges(self):
        tables = self.client.get('/api/admin/database/tables/')
        self.assertEqual(tables.status_code, 200, tables.data)
        self.assertNotIn('tasks', {row['table_key'] for row in tables.data})
        self.assertEqual(self.client.get('/api/admin/database/table/tasks/').status_code, 403)
        blocked = self.client.delete('/api/admin/database/table/resources/00000000-0000-0000-0000-000000000001/')
        self.assertEqual(blocked.status_code, 403, blocked.data)
        escalation = self.client.patch(f'/api/admin/database/table/roles/{self.role.pk}/',
            {'permissions': {'Tasks': {'Delete': True}}}, format='json')
        self.assertEqual(escalation.status_code, 403, escalation.data)
        skill = Skill.objects.create(name='Original skill')
        changed = self.client.patch(f'/api/admin/database/table/skills/{skill.pk}/', {'name': 'Updated skill'}, format='json')
        self.assertEqual(changed.status_code, 200, changed.data)

    def test_project_membership_still_limits_database_records(self):
        self.role.permissions['Tasks'] = {'View': True}
        self.role.save(update_fields=['permissions'])
        other_role = Role.objects.create(name='Other member')
        owner = UserData.objects.create(user_name='other_member', employee_id='POL2', first_name='Other', last_name='Member',
            email='other-policy@example.com', password='unused', date_of_joining=date(2025, 1, 1), role_link=other_role)
        private = Project.objects.create(project_name='Private project', created_by=owner)
        task = Task.objects.create(project=private, assigned_to=owner, Task_Name='Private task', description='')
        response = self.client.get(f'/api/admin/database/table/tasks/{task.pk}/')
        self.assertEqual(response.status_code, 404, response.data)

    def test_calendar_stays_accessible_without_exposing_denied_resources(self):
        Task.objects.create(project=self.project, assigned_to=self.user, Task_Name='Hidden task', description='', Due_Date=date(2026, 11, 5))
        response = self.client.get('/api/calendar/events/?start=2026-11-01&end=2026-11-30')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['events'], [])
        self.assertEqual(response.data['count'], 0)

    def test_assigned_users_need_edit_permission_for_task_status_changes(self):
        self.role.permissions['Tasks'] = {'View': True, 'Edit': False}
        self.role.save(update_fields=['permissions'])
        task = Task.objects.create(project=self.project, assigned_to=self.user, review_by=self.user,
            Task_Name='Assigned task', description='')
        response = self.client.patch(f'/api/tasks/{task.pk}/status/', {'status': 'in_progress'}, format='json')
        self.assertEqual(response.status_code, 403, response.data)
        self.role.permissions['Tasks']['Edit'] = True
        self.role.save(update_fields=['permissions'])
        response = self.client.patch(f'/api/tasks/{task.pk}/status/', {'status': 'in_progress'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)

    def test_new_roles_have_only_supported_entries_and_unsupported_grants_are_rejected(self):
        created = self.client.post('/api/roles/', {'name': 'New reviewer'}, format='json')
        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(set(created.data['permissions']), set(MODULE_ACTIONS))
        self.assertFalse(any(enabled for actions in created.data['permissions'].values() for enabled in actions.values()))
        for permissions in ({'Dashboard': {'View': True}}, {'TeamStatus': {'Edit': True}}):
            response = self.client.patch(f'/api/roles/{self.role.pk}/', {'permissions': permissions}, format='json')
            self.assertEqual(response.status_code, 400, response.data)

    def test_cleanup_removes_extra_entries_without_deleting_roles_or_assignments(self):
        migration = import_module('api.migrations.0016_limit_role_permission_modules')
        migration.clean_permissions(apps, SimpleNamespace(connection=connection))
        self.role.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(set(self.role.permissions), set(MODULE_ACTIONS))
        self.assertTrue(self.role.permissions['Documents']['View'])
        self.assertFalse(self.role.permissions['Tasks']['View'])
        self.assertEqual(self.user.role_link_id, self.role.pk)
        self.assertTrue(Role.objects.filter(pk=self.role.pk).exists())
