from rest_framework import serializers

from api.models import ProjectChatMessage


class ChatSendSerializer(serializers.Serializer):
    content = serializers.CharField(allow_blank=False, trim_whitespace=True, max_length=10000)
    client_id = serializers.CharField(required=False, max_length=100, allow_blank=False)
    parent_message_id = serializers.UUIDField(required=False)


class ChatTypingSerializer(serializers.Serializer):
    active = serializers.BooleanField()


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.user_name', read_only=True)
    parent_message_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = ProjectChatMessage
        fields = ('id', 'room', 'sender', 'sender_name', 'content', 'client_id',
                  'attachment', 'parent_message', 'parent_message_id', 'is_edited', 'created_at', 'updated_at')
