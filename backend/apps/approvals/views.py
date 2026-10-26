import json

from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Task, TaskDependency, ResourceFile
from apps.audit.services import LogService
from apps.roles.permissions import allowed_projects, has_permission, is_admin, require_permission
from apps.tasks.permissions import can_review_task


def review_tasks(user, project=None):
    tasks = Task.objects.filter(project__in=allowed_projects(user), status='in_review')
    if not is_admin(user):
        tasks = tasks.filter(Q(review_by=user) | Q(project__created_by=user) | Q(project__project_managers=user)).distinct()
    if project:
        tasks = tasks.filter(project=project)
    return tasks.select_related('project', 'assigned_to', 'assigned_to__role_link', 'feature__Milestone').prefetch_related('project__project_managers')


def managed_dependencies(user, project=None):
    dependencies = TaskDependency.objects.filter(task__project__in=allowed_projects(user)).exclude(status='completed')
    if not is_admin(user):
        dependencies = dependencies.filter(Q(task__project__created_by=user) | Q(task__project__project_managers=user) | Q(review_by=user, status='in_review')).distinct()
    if project:
        dependencies = dependencies.filter(task__project=project)
    return dependencies.select_related('task__project', 'assigned_to', 'depends_on').order_by('-created_at')


def approval_data(user, project=None):
    reviews = []
    tasks = list(review_tasks(user, project)) if has_permission(user, 'Tasks', 'View') else []
    dependency_rows = list(managed_dependencies(user, project)) if has_permission(user,'Dependencies','View') else []
    metadata = {}
    document_ids = set()
    for task in tasks:
        try:
            value = json.loads(task.Remarks or '{}')
        except ValueError:
            value = {}
        metadata[task.pk] = value if isinstance(value, dict) else {}
        submission = metadata[task.pk].get('review_submission', {})
        if isinstance(submission, dict):
            for document_id in submission.get('documents') or []:
                try:
                    document_ids.add(serializers.UUIDField().run_validation(document_id))
                except serializers.ValidationError:
                    continue
    for dependency in dependency_rows:
        for document_id in dependency.submission.get('documents', []):
            try:
                document_ids.add(serializers.UUIDField().run_validation(document_id))
            except serializers.ValidationError:
                continue
    documents = {str(document.pk): document for document in ResourceFile.objects.filter(
        pk__in=document_ids, project__in=allowed_projects(user))}
    for task in tasks:
        submission = metadata[task.pk].get('review_submission', {})
        if not isinstance(submission, dict):
            submission = {}
        attachments = []
        for key in submission.get('documents') or []:
            document = documents.get(str(key))
            if document and document.project_id == task.project_id:
                attachments.append({'id': document.pk, 'name': document.file_name,
                    'url': f'/api/documents/{document.pk}/download/', 'size': document.file_size})
        reviews.append({'id': task.pk, 'type': 'task', 'title': task.Task_Name, 'can_review': can_review_task(user, task),
            'project_id': task.project_id, 'project_name': task.project.project_name,
            'submitted_by': f'{task.assigned_to.first_name} {task.assigned_to.last_name}'.strip(),
            'role': task.assigned_to.role, 'submitted_at': task.updated_at, 'status': task.status,
            'priority': task.priority, 'due_date': task.Due_Date, 'description': task.description,
            'submission': submission.get('description', ''), 'links': submission.get('links') or [],
            'attachments': attachments, 'feature_name': task.feature.feature_name if task.feature_id else '',
            'milestone_name': task.feature.Milestone.name if task.feature_id else ''})
    dependencies = []
    if has_permission(user, 'Dependencies', 'View'):
        for dependency in dependency_rows:
            person = dependency.assigned_to
            dependencies.append({'id': dependency.pk, 'type': 'dependency', 'title': dependency.description,
                'project_id': dependency.task.project_id, 'project_name': dependency.task.project.project_name,
                'submitted_by': f'{person.first_name} {person.last_name}'.strip() if person else 'Unassigned',
                'submitted_at': dependency.created_at, 'status': dependency.status,
                'priority': 'high' if dependency.dependency_type == 'mandatory' else 'medium',
                'due_date': dependency.due_date, 'task_name': dependency.task.Task_Name,
                'provider_task': dependency.depends_on.Task_Name if dependency.depends_on_id else '',
                'description': dependency.description, 'dependency_type': dependency.dependency_type,
                'submission': dependency.submission.get('description',''), 'links': dependency.submission.get('links',[]),
                'attachments':[{'id':documents[key].pk, 'name':documents[key].file_name, 'size':documents[key].file_size,
                    'url':f'/api/documents/{documents[key].pk}/download/'} for key in dependency.submission.get('documents',[])
                    if key in documents and documents[key].project_id == dependency.task.project_id]})
    return {'reviews': reviews, 'dependencies': dependencies}


class ApprovalListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (has_permission(request.user, 'Tasks', 'View') or has_permission(request.user, 'Dependencies', 'View')):
            raise PermissionDenied('Access denied.')
        project = None
        if request.query_params.get('project'):
            project_id = serializers.UUIDField().run_validation(request.query_params['project'])
            project = get_object_or_404(allowed_projects(request.user), pk=project_id)
        return Response(approval_data(request.user, project))


class DependencyDecisionView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, dependency_id):
        require_permission(request.user, 'Dependencies', 'Edit')
        decision = serializers.ChoiceField(choices=['approve', 'decline']).run_validation(request.data.get('decision'))
        with transaction.atomic():
            dependency = get_object_or_404(managed_dependencies(request.user), pk=dependency_id)
            dependency = TaskDependency.objects.select_for_update().get(pk=dependency.pk)
            if dependency.status == 'completed':
                raise serializers.ValidationError('This dependency is already completed.')
            reason = serializers.CharField(max_length=2000, required=False, allow_blank=True).run_validation(request.data.get('reason', ''))
            if dependency.start_Time and not dependency.pause_Time:
                from django.utils import timezone
                from datetime import timedelta
                dependency.Time_Taken = (dependency.Time_Taken or timedelta()) + (timezone.now() - dependency.start_Time)
            dependency.start_Time = None
            dependency.pause_Time = None
            dependency.status = 'completed' if decision == 'approve' else 'paused'
            dependency.save(update_fields=['status','Time_Taken','start_Time','pause_Time'])
            LogService.log_audit_event(actor=request.user, action=f'dependency_{decision}',
                entity_type='dependency', entity=dependency, request=request,
                new_values={'status': dependency.status, 'reason': reason})
        return Response({'id': dependency.pk, 'status': dependency.status})
