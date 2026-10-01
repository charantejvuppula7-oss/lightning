from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient

from api.models import Project, Role, UserData, Department, Milestones, Milestone_Features, Task


class AssignedProjectListTests(TestCase):
    def test_member_sees_only_assigned_projects_without_projects_view_permission(self):
        role = Role.objects.create(name='member', permissions={})
        member = UserData.objects.create(
            user_name='member', employee_id='M1', first_name='Project', last_name='Member',
            email='member@example.com', password='unused',
            date_of_joining=date(2025, 1, 1), role_link=role,
        )
        owner = UserData.objects.create(
            user_name='owner', employee_id='O1', first_name='Project', last_name='Owner',
            email='owner@example.com', password='unused',
            date_of_joining=date(2025, 1, 1), role_link=role,
        )
        assigned = Project.objects.create(project_name='Assigned', created_by=owner)
        assigned.team_members.add(member)
        Project.objects.create(project_name='Private', created_by=owner)

        client = APIClient()
        client.force_authenticate(user=member)
        response = client.get('/api/projects/assigned/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['results'], [{'id': assigned.pk, 'project_name': 'Assigned'}])
        self.assertEqual(client.get('/api/projects/').status_code, 403)
        self.assertEqual(APIClient().get('/api/projects/assigned/').status_code, 401)

        admin = UserData.objects.create(
            user_name='admin', employee_id='A1', first_name='Site', last_name='Admin',
            email='admin@example.com', password='unused',
            date_of_joining=date(2025, 1, 1), role_link=Role.objects.create(name='admin'),
        )
        client.force_authenticate(user=admin)
        self.assertEqual(client.get('/api/projects/assigned/').data['results'], [])


class ProjectSetupTests(TestCase):
    def setUp(self):
        self.admin = UserData.objects.create(
            user_name='setup_admin', employee_id='SA1', first_name='Setup', last_name='Admin',
            email='setup@example.com', password='unused',
            date_of_joining=date(2025, 1, 1), role_link=Role.objects.create(name='admin'),
        )
        self.department = Department.objects.create(name='Software')
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    def test_complete_wizard_payload_can_be_created_read_and_edited(self):
        payload = {
            'project_code': 'AP028', 'project_name': 'Industrial Data Logger',
            'description': 'Build the logger', 'customer_name': 'Acme Automation',
            'priority_name': 'medium', 'project_type_name': 'web',
            'start_date': '2026-10-01', 'end_date': '2026-12-31',
            'project_managers': [str(self.admin.pk)], 'team_members': [str(self.admin.pk)],
            'departments': [str(self.department.pk)], 'points_per_working_day': 2,
            'resource_links': ['https://example.com/spec'],
            'milestones': [{
                'name': 'MVP', 'description': 'First release', 'start_date': '2026-10-01',
                'due_date': '2026-11-15', 'features': [{
                    'feature_name': 'Authentication', 'description': 'Login',
                    'feature_start_date': '2026-10-02', 'feature_due_date': '2026-11-01T00:00:00Z',
                    'tasks': [{
                        'temp_id': 'task-one', 'Task_Name': 'Login API', 'description': 'Implement login',
                        'assigned_to': str(self.admin.pk), 'review_by': str(self.admin.pk),
                        'planned_start_date': '2026-10-03', 'Due_Date': '2026-10-15',
                        'Remarks': '{"priority":"medium"}', 'sprint_ref': 'sprint-one',
                    }],
                }],
            }],
            'sprints': [{
                'client_id': 'sprint-one', 'Sprint_No': 'SP-001', 'Sprint_Name': 'Sprint 1',
                'Sprint_start_date': '2026-10-01', 'Sprint_end_date': '2026-10-14',
                'exclude_weekends': True, 'team_members': [str(self.admin.pk)],
            }],
            'dependencies': [{
                'task_ref': 'task-one', 'description': 'Get credentials',
                'assigned_to': str(self.admin.pk), 'due_date': '2026-10-05',
            }],
        }
        options = self.client.get('/api/projects/setup-options/')
        self.assertEqual(options.status_code, 200)
        self.assertEqual(options.data['departments'][0]['id'], self.department.pk)

        response = self.client.post('/api/projects/', payload, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        project_id = response.data['id']
        self.assertEqual(response.data['resource_links'], ['https://example.com/spec'])
        self.assertEqual(response.data['references']['tasks']['task-one'], str(response.data['tasks'][0]['id']))
        self.assertEqual(Milestones.objects.filter(project_id=project_id).count(), 1)
        self.assertEqual(Milestone_Features.objects.filter(Milestone__project_id=project_id).count(), 1)
        self.assertEqual(Task.objects.filter(project_id=project_id).count(), 1)

        detail = self.client.get(f'/api/projects/{project_id}/setup/')
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(str(detail.data['milestones'][0]['start_date']), '2026-10-01')
        self.assertEqual(str(detail.data['tasks'][0]['planned_start_date']), '2026-10-03')
        self.assertEqual(len(detail.data['dependencies']), 1)

        updated = self.client.patch(f'/api/projects/{project_id}/', {
            'customer_name': 'Acme Updated', 'resource_links': ['https://example.com/updated'],
        }, format='json')
        self.assertEqual(updated.status_code, 200, updated.data)
        self.assertEqual(updated.data['customer_name'], 'Acme Updated')
        self.assertEqual(updated.data['resource_links'], ['https://example.com/updated'])
