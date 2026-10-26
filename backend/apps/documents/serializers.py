from pathlib import PurePath

from rest_framework import serializers

from api.models import ResourceFile


class DocumentSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.project_name', read_only=True)
    uploaded_by_name = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ResourceFile
        fields = ('id', 'project', 'project_name', 'file_name', 'file_type', 'file_size',
                  'uploaded_at', 'uploaded_by', 'uploaded_by_name', 'file_url')
        read_only_fields = tuple(field for field in fields if field != 'file_name')

    def get_uploaded_by_name(self, instance):
        user = instance.uploaded_by
        return f'{user.first_name} {user.last_name}'.strip() if user else 'Unknown uploader'

    def get_file_url(self, instance):
        return f'/api/documents/{instance.pk}/download/'

    def validate_file_name(self, value):
        if not value.strip() or PurePath(value).name != value or '\\' in value or '/' in value:
            raise serializers.ValidationError('Enter a file name without a directory path.')
        return value.strip()
