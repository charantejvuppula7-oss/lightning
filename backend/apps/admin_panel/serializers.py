"""
Admin Panel Serializers
~~~~~~~~~~~~~~~~~~~~~~~

Lightweight, read-only serializers for the three admin monitoring views:
  - ApiRequestLog  → API Logs page
  - AuditLog       → Audit Logs page
"""

from rest_framework import serializers
from api.models import ApiRequestLog, AuditLog


class ApiLogSerializer(serializers.ModelSerializer):
    """Serializes a single API request log row for the admin logs table."""

    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ApiRequestLog
        fields = [
            'id', 'request_id', 'user_name', 'method', 'path',
            'status_code', 'response_time_ms', 'ip_address',
            'user_agent', 'request_body_size', 'created_at',
        ]

    def get_user_name(self, obj):
        return obj.user.user_name if obj.user else 'Anonymous'


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializes a single audit log entry for the admin audit table."""

    user_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user_name', 'action', 'entity_type', 'entity_id',
            'entity_name', 'description', 'context', 'old_values',
            'new_values', 'ip_address', 'request_path', 'timestamp',
        ]

    def get_user_name(self, obj):
        return obj.user.user_name if obj.user else 'System'
