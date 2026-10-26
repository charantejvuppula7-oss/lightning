import json
from datetime import timedelta

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.documents.submissions import review_submission
from apps.audit.services import LogService
from apps.roles.permissions import require_permission, scope_queryset
from apps.tasks.permissions import manages_tasks
from apps.tasks.views import TASK_QUERYSET
from apps.tasks.serializers import TaskSerializer


class TaskStatusInput(serializers.Serializer):
    status = serializers.ChoiceField(choices=['in_progress', 'paused', 'in_review', 'completed', 'started', 'change_requested'])
    description = serializers.CharField(required=False, allow_blank=True, max_length=10000)
    links = serializers.ListField(child=serializers.URLField(), required=False, max_length=30)


class TaskStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, task_id):
        require_permission(request.user, 'Tasks', 'View')
        values = request.data.copy()
        if 'links' in values and isinstance(values['links'], str):
            try:
                values['links'] = json.loads(values['links'])
            except ValueError:
                raise ValidationError({'links': 'Enter a list of valid links.'})
        # Convert multipart input before validating list fields.
        data = {key: values[key] for key in ('status', 'description', 'links') if key in values}
        serializer = TaskStatusInput(data=data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        with transaction.atomic():
            task = get_object_or_404(scope_queryset(request.user, 'task', TASK_QUERYSET), pk=task_id)
            from api.models import Task
            task = Task.objects.select_related('project').select_for_update(of=('self',)).get(pk=task.pk)
            manager = manages_tasks(request.user, task.project)
            target = data['status']
            reviewer = task.review_by_id == request.user.pk
            assignee = task.assigned_to_id == request.user.pk
            if target == 'change_requested' or (target == 'completed' and task.review_by_id):
                if not (manager or reviewer):
                    raise PermissionDenied('Only the reviewer or project manager can approve this task.')
            elif not (manager or assignee):
                raise PermissionDenied('Only the assignee or project manager can update this task.')
            if target == 'paused' and task.status != 'in_progress':
                raise ValidationError({'status': 'Only an in-progress task can be paused.'})
            if target == 'started' and task.status != 'completed':
                raise ValidationError({'status': 'Only a completed task can be reopened.'})
            if target == 'in_review' and task.status not in ('open', 'in_progress'):
                raise ValidationError({'status': 'Only assigned or in-progress tasks can be submitted for review.'})
            if target == 'in_review' and not task.review_by_id:
                raise ValidationError({'status': 'This task has no reviewer. Mark it completed instead.'})
            if target == 'change_requested' and (task.status != 'in_review' or not data.get('description')):
                raise ValidationError({'description': 'Enter a reason while the task is in review.'})
            if target == 'completed' and task.status not in (('in_review',) if task.review_by_id else ('open', 'in_progress')):
                raise ValidationError({'status': 'Task is not ready for completion.'})
            if target == 'in_progress' and task.status not in ('open', 'in_progress'):
                raise ValidationError({'status': 'Reopen the completed task first.'})
            now = timezone.now()
            if task.start_Time and not task.pause_Time:
                task.Time_Taken = (task.Time_Taken or timedelta()) + (now - task.start_Time)
            task.start_Time = now if target == 'in_progress' else None
            task.pause_Time = now if target == 'paused' else None
            task.status = {'paused': 'in_progress', 'started': 'open', 'change_requested': 'in_progress'}.get(target, target)
            try:
                metadata = json.loads(task.Remarks or '{}')
            except ValueError:
                metadata = {}
            if not isinstance(metadata, dict):
                metadata = {}
            if target in ('completed', 'started'):
                metadata['change_requested'] = False
            if target == 'started':
                metadata['reopened'] = True
                metadata['reopen_count'] = int(metadata.get('reopen_count', 0)) + 1
            if target == 'change_requested':
                metadata['change_requested'] = True
                history = metadata.get('change_requests', [])
                if not isinstance(history, list):
                    history = []
                history.append({'title': 'Change requested', 'date': now.date().isoformat(), 'changes': [data['description']], 'attachments': []})
                metadata['change_requests'] = history
            if target == 'in_review':
                metadata['review_submission'] = review_submission(request, task.project, data)
                metadata['reopened'] = False
                metadata['change_requested'] = False
            task.Remarks = json.dumps(metadata)
            task.save()
            LogService.log_audit_event(actor=request.user, action='updated_status', entity_type='task', entity=task, request=request)
        return Response(TaskSerializer(task, context={'request': request}).data)
