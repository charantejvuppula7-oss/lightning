"""Navbar search, scoped through the existing resource permission rules."""
from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Task, Project, UserData, ResourceFile
from apps.roles.permissions import has_permission, scope_queryset, allowed_projects


class GlobalSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '').strip()[:200]
        results = dict(query=query, total=0, tasks=[], projects=[], people=[], documents=[])
        if not query:
            return Response(results)
        user = request.user
        if has_permission(user, 'Tasks', 'View'):
            tasks = scope_queryset(user, 'task', Task.objects.select_related('project', 'assigned_to').only(
                'id', 'Task_Name', 'status', 'description', 'project__id', 'project__project_name',
                'assigned_to__id', 'assigned_to__user_name'))
            for task in tasks.filter(Q(Task_Name__icontains=query) | Q(description__icontains=query))[:12]:
                results['tasks'].append(dict(id=str(task.pk), title=task.Task_Name, status=task.status,
                    project_id=str(task.project_id), project_name=task.project.project_name,
                    assignee=str(task.assigned_to or '')))
        if has_permission(user, 'Projects', 'View'):
            for project in allowed_projects(user).filter(Q(project_name__icontains=query) | Q(project_code__icontains=query))[:8]:
                results['projects'].append(dict(id=str(project.pk), name=project.project_name, code=project.project_code))
        if has_permission(user, 'User Management', 'View'):
            users = scope_queryset(user, 'user', UserData.objects.select_related('role_link'))
            for person in users.filter(Q(first_name__icontains=query) | Q(last_name__icontains=query) | Q(user_name__icontains=query))[:8]:
                results['people'].append(dict(id=str(person.pk), name=f'{person.first_name} {person.last_name}',
                    username=person.user_name, email=person.email, role=person.role, designation=person.designation))
        if has_permission(user, 'Documents', 'View'):
            documents = ResourceFile.objects.filter(project__in=allowed_projects(user)).select_related('project')
            for document in documents.filter(file_name__icontains=query)[:8]:
                results['documents'].append(dict(id=str(document.pk), name=document.file_name,
                    project_id=str(document.project_id), project_name=document.project.project_name))
        results['total'] = sum(len(results[key]) for key in ('tasks', 'projects', 'people', 'documents'))
        return Response(results)
