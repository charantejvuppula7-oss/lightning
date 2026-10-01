import secrets
import uuid
from datetime import timedelta
from django.db import models
from django.contrib.auth.hashers import make_password
from django.utils import timezone


class PasswordResetOTP(models.Model):
    """
    Stores 6-digit OTP codes and reset tokens for the password reset workflow.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        'UserData',
        on_delete=models.CASCADE,
        related_name='password_reset_otps'
    )
    otp_code = models.CharField(max_length=128)
    reset_token = models.UUIDField(default=uuid.uuid4, unique=True)
    is_verified = models.BooleanField(default=False)
    is_used = models.BooleanField(default=False)
    attempts = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        db_table = 'api_password_reset_otp'
        ordering = ['-created_at']

    @classmethod
    def create_for_user(cls, user, expiry_minutes=10):
        # Invalidate any unused prior OTPs for this user
        cls.objects.filter(user=user, is_used=False).update(is_used=True)

        # Generate random 6-digit string
        code = f"{secrets.randbelow(1000000):06d}"
        expires = timezone.now() + timedelta(minutes=expiry_minutes)

        record = cls.objects.create(
            user=user,
            otp_code=make_password(code),
            expires_at=expires
        )
        return record, code

    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"OTP for {self.user.user_name}"
