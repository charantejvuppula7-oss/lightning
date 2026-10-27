from rest_framework import serializers

from api.models import TaskDependency
from apps.core.utils import validate_model_attributes
from apps.roles.permissions import require_project_scope, is_admin
from rest_framework.exceptions import PermissionDenied


def can_manage_dependency(user, task):
    return is_admin(user) or task.assigned_to_id == user.pk or task.project.created_by_id == user.pk or task.project.project_managers.filter(pk=user.pk).exists()


class DependencySerializer(serializers.ModelSerializer):
    """
    Serializer for TaskDependency entities enforcing project authorization and attribute validity.
    """
    description = serializers.CharField(required=False, allow_blank=True, default='')
    task_name = serializers.CharField(source='task.Task_Name', read_only=True)
    project_id = serializers.UUIDField(source='task.project_id', read_only=True)
    project_name = serializers.CharField(source='task.project.project_name', read_only=True)
    project_code = serializers.CharField(source='task.project.project_code', read_only=True)
    task_assigned_to_id = serializers.UUIDField(source='task.assigned_to_id', read_only=True)
    task_assigned_to_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    reviewer_name = serializers.SerializerMethodField()
    milestone_name = serializers.CharField(source='task.feature.Milestone.name', read_only=True, default='')
    feature_name = serializers.CharField(source='task.feature.feature_name', read_only=True, default='')
    priority = serializers.CharField(source='task.priority', read_only=True)
    history = serializers.SerializerMethodField()

    def get_task_assigned_to_name(self, obj):
        return self.person_name(obj.task.assigned_to)

    def get_assigned_to_name(self, obj):
        return self.person_name(obj.assigned_to)

    def get_reviewer_name(self, obj):
        return self.person_name(obj.review_by)

    @staticmethod
    def person_name(person):
        return f'{person.first_name} {person.last_name}'.strip() or person.user_name if person else 'Unassigned'

    def get_history(self, obj):
        return self.context.get('history', {}).get(str(obj.pk), [])

    class Meta:
        model = TaskDependency
        fields = ('id', 'task', 'depends_on', 'description', 'dependency_type', 'assigned_to',
                  'due_date', 'status', 'Time_Taken', 'start_Time',
                  'pause_Time', 'created_at', 'review_by', 'submission', 'task_name', 'project_id', 'project_name',
                  'project_code', 'task_assigned_to_id', 'task_assigned_to_name', 'assigned_to_name', 'reviewer_name', 'milestone_name', 'feature_name', 'priority', 'history')
        read_only_fields = ('id', 'created_at', 'Time_Taken', 'start_Time', 'pause_Time', 'submission', 'status')

    def validate(self, attrs):
        """
        Validate task project scope and verify model-level attribute constraints.

        Args:
            attrs (dict): Serializer input data.

        Returns:
            dict: Validated attributes.
        """
        task = attrs.get('task', self.instance.task if self.instance else None)
        if task is not None:
            actor = self.context['request'].user
            require_project_scope(actor, task.project)
            if not can_manage_dependency(actor, task):
                raise PermissionDenied('Only the task owner or project manager can edit dependency assignments.')
        validate_model_attributes(TaskDependency, self.instance, attrs)
        return attrs
