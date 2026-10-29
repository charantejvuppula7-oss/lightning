"""Task status, review metadata and timer transitions shared by write paths."""
import json
from datetime import timedelta

from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.documents.submissions import review_submission
from apps.roles.permissions import require_permission
from apps.tasks.permissions import manages_tasks


def apply_task_status(task, data, request):
    manager = manages_tasks(request.user, task.project)
    target = data['status']
    if target not in ('in_progress', 'paused', 'in_review', 'completed', 'started', 'change_requested'):
        raise ValidationError({'status': 'Invalid task status transition.'})
    reviewer = task.review_by_id == request.user.pk
    assignee = task.assigned_to_id == request.user.pk
    if target == 'change_requested' or (target == 'completed' and task.review_by_id):
        require_permission(request.user, 'Tasks', 'Edit')
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
    return task
