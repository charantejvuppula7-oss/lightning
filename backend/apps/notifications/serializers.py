"""
Serializers for in-app notification data representation.
"""

from rest_framework import serializers

from apps.notifications.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for the `Notification` model.

    Enriches notifications with computed metadata:
    - `resource_type`: Distinguishes between 'task', 'dependency', and 'chat_message'.
    - `project`: Resolves the human-readable project title from the serializer context.
    """
    resource_type = serializers.SerializerMethodField()
    project = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ('id', 'title', 'message', 'notification_type', 'resource_type',
                  'resource_id', 'notification_date', 'is_read', 'created_at', 'project')

    def get_resource_type(self, obj):
        """
        Derive the category of the referenced entity.

        Args:
            obj (Notification): Notification instance.

        Returns:
            str: 'chat_message', 'task', or 'dependency'.
        """
        if obj.notification_type == Notification.CHAT_MENTION:
            return 'chat_message'
        return 'task' if obj.notification_type.startswith('task_') else 'dependency'

    def get_project(self, obj):
        """
        Extract the project name associated with this notification from context.

        Args:
            obj (Notification): Notification instance.

        Returns:
            str: Project title if found in `context['project_names']`, else empty string.
        """
        return self.context.get('project_names', {}).get(obj.resource_id, '')

