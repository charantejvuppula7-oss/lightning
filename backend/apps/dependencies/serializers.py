from rest_framework import serializers

from api.models import TaskDependency
from apps.core.utils import validate_model_attributes
from apps.roles.permissions import require_project_scope


class DependencySerializer(serializers.ModelSerializer):
    """
    Serializer for TaskDependency entities enforcing project authorization and attribute validity.
    """
    class Meta:
        model = TaskDependency
        fields = ('id', 'task', 'depends_on', 'description', 'dependency_type', 'assigned_to',
                  'due_date', 'status', 'Time_Taken', 'start_Time',
                  'pause_Time', 'created_at')
        read_only_fields = ('id', 'created_at')

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
            require_project_scope(self.context['request'].user, task.project)
        validate_model_attributes(TaskDependency, self.instance, attrs)
        return attrs
