from rest_framework import serializers

from api.models import Task
from apps.roles.permissions import require_project_scope
from apps.core.utils import normalize_aliases, validate_model_attributes


class TaskSerializer(serializers.ModelSerializer):
    def to_internal_value(self, data):
        return super().to_internal_value(normalize_aliases(data, {'Status': 'status'}))

    class Meta:
        model = Task
        fields = ('id', 'Task_Name', 'project', 'assigned_to', 'description', 'status',
                  'Remarks', 'Time_Taken', 'Due_Date', 'start_Time', 'pause_Time',
                  'review_by', 'sprint', 'feature', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate(self, attrs):
        if 'project' in attrs:
            require_project_scope(self.context['request'].user, attrs['project'])
        validate_model_attributes(Task, self.instance, attrs)
        return attrs

    def update(self, instance, validated_data):
        if 'status' in validated_data:
            instance.transition_to(validated_data.pop('status'), save=False)
        return super().update(instance, validated_data)
