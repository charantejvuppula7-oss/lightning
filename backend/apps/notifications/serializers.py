from rest_framework import serializers

from apps.notifications.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    resource_type = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ('id', 'title', 'message', 'notification_type', 'resource_type',
                  'resource_id', 'notification_date', 'is_read', 'created_at')

    def get_resource_type(self, obj):
        return 'task' if obj.notification_type.startswith('task_') else 'dependency'
