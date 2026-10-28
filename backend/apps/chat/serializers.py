from rest_framework import serializers

from api.models import ProjectChatMessage


class ChatSendSerializer(serializers.Serializer):
    content = serializers.CharField(allow_blank=True, trim_whitespace=True, max_length=10000)
    client_id = serializers.CharField(required=False, max_length=100, allow_blank=False)
    parent_message_id = serializers.UUIDField(required=False)
    attachment_id = serializers.UUIDField(required=False)

    def validate(self, attrs):
        if not attrs.get('content') and not attrs.get('attachment_id'):
            raise serializers.ValidationError('Enter a message or attach a file.')
        return attrs


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.user_name', read_only=True)
    sender_display_name = serializers.SerializerMethodField()
    sender_role = serializers.CharField(source='sender.role', read_only=True)
    attachment_size = serializers.IntegerField(source='attachment.file_size', read_only=True, default=0)
    parent_message_id = serializers.UUIDField(read_only=True)
    thread_count = serializers.SerializerMethodField()
    reaction_count = serializers.SerializerMethodField()
    reacted = serializers.SerializerMethodField()

    def get_sender_display_name(self, instance):
        return f'{instance.sender.first_name} {instance.sender.last_name}'.strip() or instance.sender.user_name

    def get_thread_count(self, instance):
        return instance.reply_count if hasattr(instance, 'reply_count') else instance.replies.count()

    def get_reaction_count(self, instance):
        return len(instance.reactions.all())

    def get_reacted(self, instance):
        request = self.context.get('request')
        return bool(request and any(item.user_id == request.user.pk for item in instance.reactions.all()))

    attachment_name = serializers.CharField(source='attachment.file_name', read_only=True, default='')
    attachment_url = serializers.SerializerMethodField()

    def get_attachment_url(self, instance):
        return f'/api/documents/{instance.attachment_id}/download/' if instance.attachment_id else None

    class Meta:
        model = ProjectChatMessage
        fields = ('id', 'room', 'sender', 'sender_name', 'sender_display_name', 'sender_role', 'attachment_size', 'content', 'client_id',
                  'attachment', 'attachment_name', 'attachment_url', 'parent_message', 'parent_message_id', 'thread_count', 'reaction_count', 'reacted', 'is_edited', 'created_at', 'updated_at')
