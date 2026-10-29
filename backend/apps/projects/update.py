"""Apply the project editor's ordered changes in one database transaction."""
from uuid import UUID
import json

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Project
from apps.audit.services import LogService
from apps.dependencies.serializers import DependencySerializer, can_manage_dependency
from apps.features.serializers import FeatureSerializer
from apps.milestones.serializers import MilestoneSerializer
from apps.notifications.services import schedule_assignment_notice
from apps.projects.serializers import ProjectSerializer
from apps.roles.permissions import allowed_projects, require_permission, require_object_access
from apps.sprints.serializers import SprintSerializer
from apps.tasks.serializers import TaskSerializer


RESOURCES = {
    'projects': ('project', ProjectSerializer, 'pk'),
    'milestones': ('milestone', MilestoneSerializer, 'project_id'),
    'features': ('feature', FeatureSerializer, 'Milestone__project_id'),
    'sprints': ('sprint', SprintSerializer, 'project_id'),
    'tasks': ('task', TaskSerializer, 'project_id'),
    'dependencies': ('dependency', DependencySerializer, 'task__project_id'),
}


class ProjectChangeSerializer(serializers.Serializer):
    resource = serializers.ChoiceField(choices=RESOURCES)
    method = serializers.ChoiceField(choices=['POST', 'PATCH', 'DELETE'])
    id = serializers.CharField(max_length=60)
    body = serializers.DictField(required=False, default=dict)


class ProjectUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def patch(self, request, project_id):
        require_permission(request.user, 'Projects', 'Edit')
        project = get_object_or_404(allowed_projects(request.user), pk=project_id)
        Project.objects.select_for_update().get(pk=project.pk)
        changes = serializers.ListField(child=ProjectChangeSerializer(), max_length=2000).run_validation(request.data.get('changes'))
        references = {}

        def resolve(value):
            if isinstance(value, str) and value.startswith('new:'):
                if value not in references:
                    raise ValidationError('Unknown project editor reference.')
                return references[value]
            return value

        for index, change in enumerate(changes):
            try:
                resource, serializer_type, project_field = RESOURCES[change['resource']]
                model = serializer_type.Meta.model
                method = change['method']
                require_permission(request.user, resource, {'POST': 'Create', 'PATCH': 'Edit', 'DELETE': 'Delete'}[method])
                if resource == 'project' and (method != 'PATCH' or change['id'] != str(project_id)):
                    raise ValidationError('Only this project may be updated.')
                record_id = None if method == 'POST' else UUID(str(resolve(change['id'])))
                instance = None if method == 'POST' else get_object_or_404(
                    model.objects.select_for_update(of=('self',)).filter(**{project_field: project_id}), pk=record_id)
                body = dict(change['body'])
                for field in ('project', 'Milestone', 'sprint', 'feature', 'task', 'depends_on'):
                    if field in body:
                        body[field] = resolve(body[field])
                if 'Remarks' in body:
                    try:
                        metadata = json.loads(body['Remarks'])
                    except (ValueError, TypeError):
                        metadata = None  # Existing tasks may retain plain-text remarks.
                    if isinstance(metadata, dict) and 'milestone_id' in metadata:
                        metadata['milestone_id'] = resolve(metadata['milestone_id'])
                        body['Remarks'] = json.dumps(metadata)
                if instance is not None:
                    require_object_access(request.user, resource, 'delete' if method == 'DELETE' else 'update', instance, body)
                    if resource == 'dependency' and not can_manage_dependency(request.user, instance.task):
                        raise PermissionDenied('Only the task owner or project manager can change this dependency.')
                if method == 'DELETE':
                    if hasattr(instance, 'validate_deletion'):
                        instance.validate_deletion()
                    LogService.log_audit_event(actor=request.user, action='deleted', entity_type=resource, entity=instance, request=request)
                    instance.delete()
                    continue
                serializer = serializer_type(instance, data=body, partial=method == 'PATCH', context={'request': request})
                serializer.is_valid(raise_exception=True)
                candidate = serializer.validated_data
                owner = candidate.get('project', getattr(instance, 'project', None))
                if resource == 'feature':
                    owner = candidate.get('Milestone', instance.Milestone if instance else None).project
                elif resource == 'dependency':
                    source = candidate.get('task', instance.task if instance else None)
                    owner = source.project
                    if not can_manage_dependency(request.user, source):
                        raise PermissionDenied('Only the task owner or project manager can edit dependencies.')
                if owner is not None and owner.pk != project_id:
                    raise ValidationError('Changes must belong to this project.')
                previous_assignee = instance.assigned_to_id if instance is not None and resource == 'task' else None
                extra = {'updated_by': request.user} if resource == 'milestone' else {}
                if resource == 'milestone' and instance is None:
                    extra['created_by'] = request.user
                saved = serializer.save(**extra)
                if method == 'POST':
                    if not change['id'].startswith('new:') or change['id'] in references:
                        raise ValidationError('Use a unique temporary reference for new records.')
                    references[change['id']] = str(saved.pk)
                if resource == 'task' and previous_assignee != saved.assigned_to_id:
                    schedule_assignment_notice(saved, request.user)
                LogService.log_audit_event(actor=request.user, action='created' if method == 'POST' else 'updated', entity_type=resource, entity=saved, request=request)
            except (serializers.ValidationError, ValueError, TypeError) as error:
                raise ValidationError({'changes': {index: getattr(error, 'detail', str(error))}}) from error
        project.refresh_from_db()
        return Response(ProjectSerializer(project, context={'request': request}).data)
