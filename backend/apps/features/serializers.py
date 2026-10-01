from rest_framework import serializers

from api.models import Milestone_Features
from apps.roles.permissions import require_project_scope


class FeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Milestone_Features
        fields = ('id', 'Milestone', 'feature_name', 'description', 'feature_status',
                  'feature_priority', 'feature_due_date', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate(self, attrs):
        if 'Milestone' in attrs:
            require_project_scope(self.context['request'].user, attrs['Milestone'].project)
            if (self.instance and self.instance.Milestone.project_id != attrs['Milestone'].project_id
                    and self.instance.tasks.exists()):
                raise serializers.ValidationError({'Milestone': 'A feature with tasks cannot move to another project.'})
        return attrs
