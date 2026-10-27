from collections import Counter, defaultdict

from django.db.models import Prefetch, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Project, Task, TaskDependency, UserData
from apps.approvals.views import approval_data
from apps.roles.permissions import allowed_projects, require_permission, scope_queryset, has_permission
from apps.users.workload import weekly_availability


def project_overview(user):
    people = UserData.objects.select_related('role_link')
    projects = Project.objects.filter(pk__in=allowed_projects(user)).select_related(
        'created_by__role_link', 'customer_link', 'priority_link', 'project_type_link'
    ).prefetch_related(Prefetch('team_members', queryset=people),
                      Prefetch('project_managers', queryset=people), 'milestones_set', 'sprints').order_by('-created_at')
    tasks = scope_queryset(user, 'task', Task.objects.all()).values('id', 'project_id', 'status', 'sprint_id', 'assigned_to_id', 'feature__Milestone_id')
    tasks = list(tasks) if has_permission(user, 'Tasks', 'View') else []
    dependencies = list(TaskDependency.objects.filter(task__project__in=projects).exclude(status='completed')
        .values('task__project_id', 'dependency_type')) if has_permission(user, 'Dependencies', 'View') else []
    tasks_by_project = defaultdict(list)
    for task in tasks:
        tasks_by_project[task['project_id']].append(task)
    dependency_counts = Counter(item['task__project_id'] for item in dependencies)
    blocker_counts = Counter(item['task__project_id'] for item in dependencies if item['dependency_type'] == 'mandatory')
    today = timezone.localdate()
    rows = []
    for project in projects:
        project_tasks = tasks_by_project[project.pk]
        counts = Counter(task['status'] for task in project_tasks)
        assignee_counts = Counter(task['assigned_to_id'] for task in project_tasks)
        sprint_counts = Counter(task['sprint_id'] for task in project_tasks)
        sprint_completed = Counter(task['sprint_id'] for task in project_tasks if task['status'] == 'completed')
        total = len(project_tasks)
        progress = round(100 * counts['completed'] / total) if total else 0
        status = ('Completed' if total and progress == 100 else 'Upcoming' if project.start_date and project.start_date > today
                  else 'Delayed' if project.end_date and project.end_date < today else 'Ongoing')
        managers = list(project.project_managers.all())
        if not managers:
            managers = [project.created_by]
        people = {person.pk: person for person in list(project.team_members.all()) + managers}
        members = [{'id': person.pk, 'name': f'{person.first_name} {person.last_name}'.strip() or person.user_name,
                    'role': person.designation or person.role, 'task_count': assignee_counts[person.pk]}
                   for person in people.values()]
        milestone_counts = Counter(task['feature__Milestone_id'] for task in project_tasks)
        milestone_completed = Counter(task['feature__Milestone_id'] for task in project_tasks if task['status'] == 'completed')
        milestones = [{'id': item.pk, 'name': item.name, 'start_date':item.start_date, 'due_date': item.due_date, 'description': item.description,
                       'task_count':milestone_counts[item.pk], 'completed':milestone_completed[item.pk],
                       'progress':round(100*milestone_completed[item.pk]/milestone_counts[item.pk]) if milestone_counts[item.pk] else 0}
                      for item in project.milestones_set.all()]
        rows.append({'id': project.pk, 'project_name': project.project_name, 'project_code': project.project_code,
            'description': project.description, 'customer': project.customer, 'priority': project.priority,
            'start_date': project.start_date, 'end_date': project.end_date, 'status': status,
            'progress': progress, 'task_counts': dict(counts), 'task_count': total,
            'dependency_count': dependency_counts[project.pk],
            'blocker_count': blocker_counts[project.pk],
            'managers': [{'id': person.pk, 'name': f'{person.first_name} {person.last_name}'.strip()} for person in managers],
            'members': members, 'milestones': milestones,
            'sprints': [{'id': sprint.pk, 'name': sprint.Sprint_Name, 'number': sprint.Sprint_No,
                'task_count': sprint_counts[sprint.pk],
                'completed': sprint_completed[sprint.pk]}
                for sprint in project.sprints.all()]})
    return rows


class ProjectOverviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        require_permission(request.user, 'Projects', 'View')
        return Response(project_overview(request.user))


class DashboardOverviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        require_permission(request.user, 'Projects', 'View')
        projects = project_overview(request.user)
        selected = None
        if request.query_params.get('project'):
            project_id = serializers.UUIDField().run_validation(request.query_params['project'])
            selected = get_object_or_404(allowed_projects(request.user), pk=project_id)
        workload = []
        if selected and has_permission(request.user, 'TeamWorLoad', 'View'):
            members = UserData.objects.filter(account_status='active').filter(
                Q(assigned_projects=selected) | Q(managed_projects=selected) | Q(default_projects=selected) | Q(pk=selected.created_by_id)).distinct()
            members = list(members)
            availability = weekly_availability(selected, [person.pk for person in members])
            workload = [{'id': person.pk, 'name': f'{person.first_name} {person.last_name}'.strip(),
                'load': availability[person.pk]['workload_percent']} for person in members]
        return Response({'projects': projects, 'workload': workload, **approval_data(request.user, selected)})
