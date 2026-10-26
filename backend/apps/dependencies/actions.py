import json
from datetime import timedelta

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.services import LogService
from apps.dependencies.serializers import DependencySerializer, can_manage_dependency
from apps.dependencies.views import DEPENDENCY_QUERYSET
from apps.documents.submissions import review_submission
from apps.notifications.models import Notification
from apps.roles.permissions import require_permission, scope_queryset, is_admin
from apps.tasks.status import TaskStatusInput


def managed_by(user, dependency):
    project = dependency.task.project
    return is_admin(user) or project.created_by_id == user.pk or project.project_managers.filter(pk=user.pk).exists()


def selected_dependency(request, dependency_id):
    require_permission(request.user, 'Dependencies', 'View')
    require_permission(request.user, 'Dependencies', 'Edit')
    return get_object_or_404(scope_queryset(request.user, 'dependency', DEPENDENCY_QUERYSET).select_for_update(of=('self',)), pk=dependency_id)


class DependencyStatusView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def patch(self, request, dependency_id):
        dependency = selected_dependency(request, dependency_id)
        data = {key: request.data[key] for key in ('status','description','links') if key in request.data}
        if isinstance(data.get('links'), str):
            try:
                data['links'] = json.loads(data['links'])
            except ValueError:
                raise ValidationError({'links':'Enter a list of valid links.'})
        serializer = TaskStatusInput(data=data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        target = data['status']
        manager = managed_by(request.user, dependency)
        if target in ('completed','change_requested') and dependency.review_by_id:
            if not (manager or dependency.review_by_id == request.user.pk):
                raise PermissionDenied('Only the reviewer or project manager may decide this review.')
        elif not (manager or dependency.assigned_to_id == request.user.pk):
            raise PermissionDenied('Only the assignee or project manager may update this dependency.')
        allowed = {'in_progress':('started','paused','in_progress'), 'paused':('in_progress',),
            'in_review':('in_progress',), 'completed':('in_review',) if dependency.review_by_id else ('in_progress',),
            'started':('completed',), 'change_requested':('in_review',)}
        if dependency.status not in allowed[target]:
            raise ValidationError({'status':'Dependency is not ready for this transition.'})
        if target == 'in_review' and not dependency.review_by_id:
            raise ValidationError({'status':'This dependency has no reviewer. Mark it completed instead.'})
        if target == 'change_requested' and not data.get('description'):
            raise ValidationError({'description':'Enter the changes needed.'})
        now = timezone.now()
        if dependency.start_Time and not dependency.pause_Time:
            dependency.Time_Taken = (dependency.Time_Taken or timedelta()) + (now - dependency.start_Time)
        dependency.start_Time = now if target == 'in_progress' else None
        dependency.pause_Time = now if target == 'paused' else None
        dependency.status = 'paused' if target == 'change_requested' else target
        if target == 'in_review':
            dependency.submission = review_submission(request, dependency.task.project, data)
        elif target == 'change_requested':
            dependency.submission = {**dependency.submission, 'change_requested':data['description']}
        dependency.save()
        LogService.log_audit_event(actor=request.user, action='status_changed', entity_type='dependency', entity=dependency, request=request, new_values={'status':dependency.status})
        return Response(DependencySerializer(dependency).data)


class DependencyNudgeView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, dependency_id):
        dependency = selected_dependency(request, dependency_id)
        if not (can_manage_dependency(request.user, dependency.task) or dependency.assigned_to_id == request.user.pk):
            raise PermissionDenied('Only involved members can nudge this dependency.')
        target = dependency.task.assigned_to if dependency.assigned_to_id == request.user.pk else dependency.assigned_to
        if target is None or target.pk == request.user.pk or target.account_status != 'active':
            raise ValidationError('There is no other assigned member to nudge.')
        actor = DependencySerializer.person_name(request.user)
        Notification.objects.create(user=target, notification_type=Notification.DEPENDENCY_NUDGE,
            resource_id=dependency.pk, title='Dependency reminder', notification_date=timezone.localdate(),
            message=f'{actor} nudged you about {dependency.description}'[:300])
        LogService.log_audit_event(actor=request.user, action='nudged', entity_type='dependency', entity=dependency, request=request, new_values={'recipient_id':str(target.pk)})
        return Response({'message':f'Nudge sent to {DependencySerializer.person_name(target)}!'})
