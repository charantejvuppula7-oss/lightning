"""Authentication and password reset operations."""

from datetime import timedelta

from django.contrib.auth.hashers import check_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth.hashers import make_password
from django.db import transaction
from django.db.models import Q
from django.db.models.functions import Lower
from django.middleware.csrf import rotate_token
from django.utils import timezone
from rest_framework.exceptions import APIException, AuthenticationFailed, Throttled, ValidationError

from api.models import PasswordResetOTP, UserData
from apps.audit.services import LogService
from services.email import EmailService


class AuthenticationService:
    """
    Core authentication service handling user session login, session rotation, and logout.
    """
    @staticmethod
    def login(request, identifier, password):
        """
        Authenticate a user by email or username, initialize session state, and rotate CSRF token.

        Args:
            request (HttpRequest): Current Django HTTP request.
            identifier (str): Username or email address.
            password (str): Plain-text password to verify against hashed database value.

        Returns:
            UserData: Authenticated active user instance.

        Raises:
            AuthenticationFailed: If credentials are invalid or user account is inactive.
        """
        field = 'email' if '@' in identifier else 'user_name'
        user = UserData.objects.select_related('role_link').alias(
            login_identifier=Lower(field)
        ).filter(login_identifier=identifier.strip().lower()).first()
        if user is None:
            make_password(password)
            valid = False
        else:
            valid = user.check_password(password) and user.account_status == 'active'
        if not valid:
            LogService.log_security_event('login_failed', request_id=getattr(request, 'request_id', None))
            raise AuthenticationFailed('Invalid credentials.')
        if request.session.get('user_id') not in (None, str(user.pk)):
            request.session.flush()
        else:
            request.session.cycle_key()
        request.session['user_id'] = str(user.pk)
        request.session['_user_auth_hash'] = user.get_session_auth_hash()
        request.session.set_expiry(None)
        request.user = user
        rotate_token(request)
        LogService.log_audit_event(actor=user, action='login', entity_type='session', request=request)
        return user

    @staticmethod
    def logout(request):
        """
        Terminate user session, flush session data, and record an audit log event.

        Args:
            request (HttpRequest): The current HTTP request with an active session.
        """
        LogService.log_audit_event(actor=request.user, action='logout', entity_type='session', request=request)
        request.session.flush()


class PasswordResetDeliveryError(APIException):
    """Exception raised when Microsoft Graph delivery of OTP verification fails."""
    status_code = 503
    default_detail = 'Unable to send the verification code. Please try again later.'


def _reset_user(identifier):
    """
    Lookup an active user by username, email, or employee ID.

    Args:
        identifier (str): User identifier string.

    Returns:
        UserData|None: Found user instance or None.
    """
    value = identifier.strip()
    return UserData.objects.filter(
        Q(user_name__iexact=value) | Q(email__iexact=value) |
        Q(employee_id__iexact=value), account_status='active').first()


def request_password_reset(identifier):
    """
    Initiate password reset flow by creating a secure OTP and emailing it to the user.

    Enforces rate-limiting of at most 3 requests per 10-minute window per account.

    Args:
        identifier (str): Username, email, or employee ID.

    Raises:
        ValidationError: If no active user or email is found.
        Throttled: If requests exceed allowable limits.
        PasswordResetDeliveryError: If email transmission fails.
    """
    user = _reset_user(identifier)
    if user is None:
        raise ValidationError({'identifier': 'No active account was found for this User ID or email.'})
    if not user.email:
        raise ValidationError({'identifier': 'This account has no email address. Contact your administrator.'})

    with transaction.atomic():
        user = UserData.objects.select_for_update().get(pk=user.pk)
        if user.account_status != 'active':
            raise ValidationError({'identifier': 'No active account was found for this User ID or email.'})
        recent = PasswordResetOTP.objects.filter(
            user=user, created_at__gte=timezone.now() - timedelta(minutes=10))
        latest = recent.order_by('-created_at').first()
        if latest:
            wait = (latest.created_at + timedelta(seconds=60) - timezone.now()).total_seconds()
            if wait > 0:
                raise Throttled(wait=wait)
        if recent.count() >= 3:
            wait = (recent.order_by('created_at').first().created_at + timedelta(minutes=10) - timezone.now()).total_seconds()
            raise Throttled(wait=max(1, wait))
        record, code = PasswordResetOTP.create_for_user(user)

    try:
        sent, error = EmailService.send_password_reset_otp(user.email, code,
            f'{user.first_name} {user.last_name}'.strip() or user.user_name)
    except Exception as exc:
        sent, error = False, type(exc).__name__
    if not sent:
        PasswordResetOTP.objects.filter(pk=record.pk).update(is_used=True)
        LogService.log_error('password_reset_email_failed', user_id=str(user.pk), error=error)
        raise PasswordResetDeliveryError()


def verify_password_reset_otp(identifier, otp_code):
    """
    Verify a submitted 6-digit OTP code against the latest pending reset record.

    Locks attempts after 5 failures to protect against brute-force guessing.

    Args:
        identifier (str): User identifier string.
        otp_code (str): Plain-text OTP code submitted by the user.

    Returns:
        UUID|None: Unique reset_token if OTP is valid and unexpired; None otherwise.
    """
    user = _reset_user(identifier)
    if user is None:
        return None
    with transaction.atomic():
        record = PasswordResetOTP.objects.select_for_update().filter(
            user=user, is_used=False).order_by('-created_at').first()
        if record is None or record.expires_at <= timezone.now() or record.attempts >= 5:
            return None
        if not check_password(otp_code, record.otp_code):
            record.attempts += 1
            record.is_used = record.attempts >= 5
            record.save(update_fields=['attempts', 'is_used'])
            return None
        record.is_verified = True
        record.save(update_fields=['is_verified'])
        return record.reset_token


def confirm_password_reset(reset_token, new_password, request=None):
    """
    Apply a new password using a verified reset token.

    Validates password strength, hashes the new password, marks OTP records as used,
    and writes an audit event.

    Args:
        reset_token (str|UUID): Verified one-time reset token.
        new_password (str): New plain-text password.
        request (Request|None): Optional current HTTP request for audit logging.

    Raises:
        ValidationError: If token is invalid/expired or new password fails policy validation.
    """
    with transaction.atomic():
        record = PasswordResetOTP.objects.select_for_update().select_related('user').filter(
            reset_token=reset_token, is_verified=True, is_used=False,
            expires_at__gt=timezone.now()).first()
        if record is None or record.user.account_status != 'active':
            raise ValidationError({'reset_token': 'Invalid or expired reset token.'})
        try:
            validate_password(new_password, user=record.user)
        except DjangoValidationError as exc:
            raise ValidationError({'new_password': exc.messages}) from exc
        user = record.user
        user.set_password(new_password)
        user.save(update_fields=['password', 'updated_at'])
        PasswordResetOTP.objects.filter(user=user, is_used=False).update(is_used=True)
        LogService.log_audit_event(actor=user, action='password_reset',
                                   entity_type='user', entity=user, request=request)

