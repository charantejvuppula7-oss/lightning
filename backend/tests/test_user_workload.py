from datetime import date

from django.contrib.auth.hashers import make_password
from django.test import TestCase
from rest_framework.test import APIClient

from api.models import Project, Role, Task, TaskDependency, UserData


class ProjectUserWorkloadTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        viewer_role = Role.objects.create(name='workload viewer', permissions={
            'TeamWorLoad': {'View': True},
        })
        denied_role = Role.objects.create(name='workload denied')
        cls.viewer = UserData.objects.create(
            user_name='workviewer', employee_id='WV1', first_name='Work', last_name='Viewer',
            email='viewer@example.com', password=make_password('password'),
            date_of_joining=date(2025, 1, 1), role_link=viewer_role)
        cls.member = UserData.objects.create(
            user_name='workmember', employee_id='WM1', first_name='Work', last_name='Member',
            email='member@example.com', password=make_password('password'),
            date_of_joining=date(2025, 1, 1), role_link=denied_role)
        cls.project = Project.objects.create(project_name='Scoped', created_by=cls.viewer)
        cls.project.team_members.add(cls.member)
        cls.other_project = Project.objects.create(project_name='Other', created_by=cls.member)
        task = Task.objects.create(project=cls.project, assigned_to=cls.member,
                                   Task_Name='Open', description='Work')
        Task.objects.create(project=cls.project, assigned_to=cls.member,
                            Task_Name='Done', description='Work', status='completed')
        Task.objects.create(project=cls.other_project, assigned_to=cls.member,
                            Task_Name='Private', description='Work')
        TaskDependency.objects.create(task=task, assigned_to=cls.member,
                                      description='Blocked', status='started')

    def client_for(self, user):
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    def test_project_workload_uses_user_filter_and_project_scope(self):
        url = f'/api/projects/{self.project.pk}/users/workload/'
        response = self.client_for(self.viewer).get(url, {'search': 'workmember'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)
        member = response.data['results'][0]
        self.assertEqual(member['task_counts'], {'open': 1, 'completed': 1})
        self.assertEqual(member['active_tasks'], 1)
        self.assertEqual(member['dependency_counts'], {'started': 1})
        self.assertEqual(member['active_dependencies'], 1)
        self.assertEqual(self.client_for(self.member).get(url).status_code, 403)
        self.assertEqual(self.client_for(self.viewer).get(
            f'/api/projects/{self.other_project.pk}/users/workload/').status_code, 404)
