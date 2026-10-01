from rest_framework import serializers

from apps.notifications.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    resource_type = serializers.SerializerMethodField()
    project = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ('id', 'title', 'message', 'notification_type', 'resource_type',
                  'resource_id', 'notification_date', 'is_read', 'created_at', 'project')

    def get_resource_type(self, obj):
        if obj.notification_type == Notification.CHAT_MENTION:
            return 'chat_message'
        return 'task' if obj.notification_type.startswith('task_') else 'dependency'

    def get_project(self, obj):
        return self.context.get('project_names', {}).get(obj.resource_id, '')
