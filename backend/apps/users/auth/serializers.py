"""Auth-related serializers — login input validation."""

from rest_framework import serializers
from apps.core.utils import normalize_aliases


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(max_length=254)
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def to_internal_value(self, data):
        return super().to_internal_value(normalize_aliases(data, {'User_Name': 'identifier', 'Password': 'password'}))


class PasswordResetRequestSerializer(serializers.Serializer):
    identifier = serializers.CharField(max_length=254)

    def to_internal_value(self, data):
        return super().to_internal_value(normalize_aliases(
            data, {'user_id': 'identifier', 'username': 'identifier', 'email': 'identifier'}))


class PasswordResetVerifySerializer(PasswordResetRequestSerializer):
    otp_code = serializers.RegexField(r'^\d{6}$')

    def to_internal_value(self, data):
        return super().to_internal_value(normalize_aliases(data, {'code': 'otp_code'}))


class PasswordResetConfirmSerializer(serializers.Serializer):
    reset_token = serializers.UUIDField()
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def to_internal_value(self, data):
        return super().to_internal_value(normalize_aliases(data, {'password': 'new_password'}))
