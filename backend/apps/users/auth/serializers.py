"""Auth-related serializers — login input validation."""

from rest_framework import serializers
from apps.core.utils import normalize_aliases


class LoginSerializer(serializers.Serializer):
    """
    Serializer validating incoming user login credentials.
    """
    identifier = serializers.CharField(max_length=254)
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def to_internal_value(self, data):
        """Map legacy casing aliases (User_Name, Password) to canonical fields."""
        return super().to_internal_value(normalize_aliases(data, {'User_Name': 'identifier', 'Password': 'password'}))


class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Serializer capturing account identifier to initiate a password reset OTP dispatch.
    """
    identifier = serializers.CharField(max_length=254)

    def to_internal_value(self, data):
        """Map identifier aliases (user_id, username, email) to 'identifier'."""
        return super().to_internal_value(normalize_aliases(
            data, {'user_id': 'identifier', 'username': 'identifier', 'email': 'identifier'}))


class PasswordResetVerifySerializer(PasswordResetRequestSerializer):
    """
    Serializer validating the 6-digit OTP code along with the account identifier.
    """
    otp_code = serializers.RegexField(r'^\d{6}$')

    def to_internal_value(self, data):
        """Map code alias to 'otp_code'."""
        return super().to_internal_value(normalize_aliases(data, {'code': 'otp_code'}))


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Serializer validating the verified reset token and new password input.
    """
    reset_token = serializers.UUIDField()
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def to_internal_value(self, data):
        """Map password alias to 'new_password'."""
        return super().to_internal_value(normalize_aliases(data, {'password': 'new_password'}))

