import json
from uuid import UUID

from rest_framework import serializers

from api.models import Task, Milestones
from apps.roles.permissions import require_project_scope
from apps.core.utils import normalize_aliases, validate_model_attributes
from apps.tasks.permissions import can_review_task


class TaskSerializer(serializers.ModelSerializer):
    """
    Serializer for the Task entity handling status normalization, project scope checks,
    and state transitions.
    """
    def to_internal_value(self, data):
        """Map legacy casing 'Status' to canonical 'status'."""
        return super().to_internal_value(normalize_aliases(data, {'Status': 'status'}))

    description = serializers.CharField(required=False, allow_blank=True)
    can_review = serializers.SerializerMethodField()

    def get_can_review(self, instance):
        request = self.context.get('request')
        return bool(request and can_review_task(request.user,instance))
    project_name = serializers.CharField(source='project.project_name', read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    review_by_name = serializers.SerializerMethodField()
    sprint_name = serializers.CharField(source='sprint.Sprint_Name', read_only=True, default='')
    feature_name = serializers.CharField(source='feature.feature_name', read_only=True, default='')
    priority = serializers.CharField(read_only=True)
    milestone_name = serializers.SerializerMethodField()
    dependency_count = serializers.SerializerMethodField()

    def get_dependency_count(self, instance):
        return instance.dependencies.count()

    def get_milestone_name(self, instance):
        if instance.feature_id:
            return instance.feature.Milestone.name
        try:
            milestone_id = json.loads(instance.Remarks or '{}').get('milestone_id')
        except (ValueError, AttributeError):
            return ''
        if not milestone_id:
            return ''
        try:
            milestone_id = UUID(str(milestone_id))
        except ValueError:
            return ''
        return Milestones.objects.filter(pk=milestone_id, project_id=instance.project_id).values_list('name', flat=True).first() or ''

    def get_assigned_to_name(self, instance):
        return f'{instance.assigned_to.first_name} {instance.assigned_to.last_name}'.strip()

    def get_review_by_name(self, instance):
        user = instance.review_by
        return f'{user.first_name} {user.last_name}'.strip() if user else ''

    class Meta:
        model = Task
        fields = ('id', 'Task_Name', 'project', 'assigned_to', 'description', 'status',
                  'Remarks', 'Time_Taken', 'Due_Date', 'planned_start_date', 'start_Time', 'pause_Time',
                  'review_by', 'sprint', 'feature', 'created_at', 'updated_at',
                  'project_name', 'assigned_to_name', 'review_by_name', 'sprint_name', 'feature_name', 'priority', 'milestone_name', 'dependency_count', 'can_review')
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate(self, attrs):
        """
        Verify actor has access to project and dry-run model attributes validation.

        Args:
            attrs (dict): Serializer input attributes.

        Returns:
            dict: Validated attributes.
        """
        if 'project' in attrs:
            require_project_scope(self.context['request'].user, attrs['project'])
        if attrs.get('Remarks'):
            try:
                metadata = json.loads(attrs['Remarks'])
            except ValueError:
                metadata = None
            if isinstance(metadata, dict) and metadata.get('milestone_id'):
                milestone_id = serializers.UUIDField().run_validation(metadata['milestone_id'])
                project = attrs.get('project') or (self.instance.project if self.instance else None)
                if not Milestones.objects.filter(pk=milestone_id, project=project).exists():
                    raise serializers.ValidationError({'Remarks': 'Milestone belongs to a different project.'})
                feature = attrs.get('feature', self.instance.feature if self.instance else None)
                if feature and feature.Milestone_id != milestone_id:
                    raise serializers.ValidationError({'feature': 'Feature belongs to a different milestone.'})
        validate_model_attributes(Task, self.instance, attrs)
        return attrs

    def update(self, instance, validated_data):
        """
        Update task and trigger state machine transitions for status changes.

        Args:
            instance (Task): Existing task instance.
            validated_data (dict): Validated input fields.

        Returns:
            Task: Updated task model instance.
        """
        if 'status' in validated_data:
            instance.transition_to(validated_data.pop('status'), save=False)
        return super().update(instance, validated_data)

