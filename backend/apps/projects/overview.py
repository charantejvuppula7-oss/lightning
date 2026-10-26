from collections import Counter

from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Task, TaskDependency, UserData
from apps.approvals.views import approval_data
from apps.projects.views import PROJECT_QUERYSET
from apps.roles.permissions import allowed_projects, require_permission, scope_queryset, has_permission
from apps.users.workload import weekly_availability


def project_overview(user):
    projects = PROJECT_QUERYSET.filter(pk__in=allowed_projects(user)).prefetch_related('milestones_set', 'sprints').order_by('-created_at')
    tasks = scope_queryset(user, 'task', Task.objects.all()).values('id', 'project_id', 'status', 'sprint_id', 'assigned_to_id', 'feature__Milestone_id')
    tasks = list(tasks) if has_permission(user, 'Tasks', 'View') else []
    dependencies = list(TaskDependency.objects.filter(task__project__in=projects).exclude(status='completed')
        .values('task__project_id', 'dependency_type')) if has_permission(user, 'Dependencies', 'View') else []
    rows = []
    for project in projects:
        project_tasks = [task for task in tasks if task['project_id'] == project.pk]
        counts = Counter(task['status'] for task in project_tasks)
        total = len(project_tasks)
        progress = round(100 * counts['completed'] / total) if total else 0
        status = ('Completed' if total and progress == 100 else 'Upcoming' if project.start_date and project.start_date > timezone.localdate()
                  else 'Delayed' if project.end_date and project.end_date < timezone.localdate() else 'Ongoing')
        managers = list(project.project_managers.all())
        if not managers:
            managers = [project.created_by]
        people = {person.pk: person for person in list(project.team_members.all()) + managers}
        members = [{'id': person.pk, 'name': f'{person.first_name} {person.last_name}'.strip() or person.user_name,
                    'role': person.designation or person.role, 'task_count': sum(task['assigned_to_id'] == person.pk for task in project_tasks)}
                   for person in people.values()]
        project_dependencies = [item for item in dependencies if item['task__project_id'] == project.pk]
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
            'dependency_count': len(project_dependencies),
            'blocker_count': sum(item['dependency_type'] == 'mandatory' for item in project_dependencies),
            'managers': [{'id': person.pk, 'name': f'{person.first_name} {person.last_name}'.strip()} for person in managers],
            'members': members, 'milestones': milestones,
            'sprints': [{'id': sprint.pk, 'name': sprint.Sprint_Name, 'number': sprint.Sprint_No,
                'task_count': sum(task['sprint_id'] == sprint.pk for task in project_tasks),
                'completed': sum(task['sprint_id'] == sprint.pk and task['status'] == 'completed' for task in project_tasks)}
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
