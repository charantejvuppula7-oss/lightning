from rest_framework import serializers

from api.models import Milestones
from apps.roles.permissions import require_project_scope
from apps.core.utils import validate_model_attributes


class MilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Milestones
        fields = ('id', 'project', 'task', 'description', 'name', 'start_date', 'due_date',
                  'created_by', 'updated_by', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_by', 'updated_by', 'created_at', 'updated_at')

    def validate(self, attrs):
        if 'project' in attrs:
            require_project_scope(self.context['request'].user, attrs['project'])
        project = attrs.get('project', self.instance.project if self.instance else None)
        task = attrs.get('task', self.instance.task if self.instance else None)
        if project and task and task.project_id != project.pk:
            raise serializers.ValidationError({'task': 'Task belongs to a different project.'})
        validate_model_attributes(Milestones, self.instance, attrs)
        return attrs
