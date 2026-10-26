from collections import Counter

from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import AuditLog, Task, TaskDependency
from apps.projects.views import PROJECT_QUERYSET
from apps.roles.permissions import allowed_projects, has_permission, require_permission, scope_queryset


class WorkspaceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        require_permission(request.user, 'Projects', 'View')
        project_id = serializers.UUIDField().run_validation(request.query_params.get('project'))
        project = get_object_or_404(PROJECT_QUERYSET.filter(pk__in=allowed_projects(request.user))
            .prefetch_related('milestones_set__features'), pk=project_id)
        tasks = list(scope_queryset(request.user, 'task', Task.objects.filter(project=project))
            .select_related('assigned_to', 'review_by', 'feature').order_by('created_at')) if has_permission(request.user,'Tasks','View') else []
        rows = [{'id':task.pk, 'name':task.Task_Name, 'description':task.description, 'status':task.status,
            'assigned_to':task.assigned_to_id, 'assignee_name':f'{task.assigned_to.first_name} {task.assigned_to.last_name}'.strip() or task.assigned_to.user_name,
            'review_by':task.review_by_id, 'reviewer_name':f'{task.review_by.first_name} {task.review_by.last_name}'.strip() if task.review_by else '',
            'feature':task.feature_id, 'milestone':task.feature.Milestone_id if task.feature_id else None,
            'due_date':task.Due_Date} for task in tasks]
        counts = Counter(row['milestone'] for row in rows)
        completed = Counter(row['milestone'] for row in rows if row['status']=='completed')
        milestones = [{'id':item.pk, 'name':item.name, 'description':item.description, 'start_date':item.start_date,
            'due_date':item.due_date, 'task_count':counts[item.pk], 'completed':completed[item.pk],
            'progress':round(100*completed[item.pk]/counts[item.pk]) if counts[item.pk] else 0,
            'features':[{'id':feature.pk, 'name':feature.feature_name} for feature in item.features.all()]}
            for item in project.milestones_set.all()]
        dependencies = TaskDependency.objects.filter(task__project=project).exclude(status='completed')
        dependency_counts = Counter(dependencies.values_list('dependency_type',flat=True)) if has_permission(request.user,'Dependencies','View') else Counter()
        activity = AuditLog.objects.filter(Q(entity_type='project',entity_id=project.pk) |
            Q(entity_type='task',entity_id__in=[task.pk for task in tasks])).select_related('user').order_by('-timestamp')[:8]
        task_names = {task.pk:task.Task_Name for task in tasks}
        total_completed = sum(task.status=='completed' for task in tasks)
        status = 'Completed' if tasks and total_completed == len(tasks) else 'Upcoming' if project.start_date and project.start_date > timezone.localdate() else 'Delayed' if project.end_date and project.end_date < timezone.localdate() else 'Ongoing'
        return Response({'project':{'id':project.pk, 'project_name':project.project_name, 'project_code':project.project_code, 'customer':project.customer, 'status':status, 'start_date':project.start_date,
            'end_date':project.end_date, 'progress':round(100*total_completed/len(tasks)) if tasks else 0, 'milestones':milestones},
            'tasks':rows, 'stats':{'tasks':len(tasks), 'dependencies':sum(dependency_counts.values()), 'blockers':dependency_counts['mandatory'],
                'due_today':sum(task.Due_Date==timezone.localdate() and task.status!='completed' for task in tasks)},
            'activities':[{'id':event.pk,'actor':(f'{event.user.first_name} {event.user.last_name}'.strip() or event.user.user_name) if event.user else 'System', 'action':event.action.replace('_',' '),
                'name':task_names.get(event.entity_id,event.entity_name), 'timestamp':event.timestamp} for event in activity]})
