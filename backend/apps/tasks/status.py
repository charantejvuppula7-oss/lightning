import json

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.services import LogService
from apps.roles.permissions import require_permission, scope_queryset
from apps.tasks.transitions import apply_task_status
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
            apply_task_status(task, data, request)
            task.save()
            LogService.log_audit_event(actor=request.user, action='updated_status', entity_type='task', entity=task, request=request)
        return Response(TaskSerializer(task, context={'request': request}).data)
