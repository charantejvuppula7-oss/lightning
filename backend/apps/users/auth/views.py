"""Authentication HTTP views — CSRF, login, session, logout."""

from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from apps.core.throttling import EndpointRateThrottle, LoginIdentifierThrottle
from rest_framework.views import APIView

from apps.users.serializers import UserSerializer
from apps.users.auth.services import (
    AuthenticationService, confirm_password_reset, request_password_reset,
    verify_password_reset_otp,
)
from apps.users.auth.serializers import (
    LoginSerializer, PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer, PasswordResetVerifySerializer,
)


class CsrfView(APIView):
    """
    Public endpoint to retrieve the initial CSRF cookie and token for single-page applications.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        """
        Set the CSRF cookie and return the active CSRF token.

        Args:
            request (Request): Unauthenticated HTTP request.

        Returns:
            Response: JSON containing {'csrfToken': '<token>'}.
        """
        return Response({'csrfToken': get_token(request)})


@method_decorator(csrf_protect, name='dispatch')
class LoginView(APIView):
    """
    User login endpoint authenticating credentials and establishing a Django session.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [EndpointRateThrottle, LoginIdentifierThrottle]

    def get_authenticate_header(self, request):
        """Declare Session authentication scheme for 401 response headers."""
        return 'Session'

    def post(self, request):
        """
        Authenticate credentials, initialize user session, rotate tokens, and return user profile.

        Args:
            request (Request): DRF request with 'identifier' and 'password'.

        Returns:
            Response: Serialized User object and fresh CSRF token.
        """
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = AuthenticationService.login(request, **serializer.validated_data)
        return Response({'user': UserSerializer(user).data, 'csrfToken': get_token(request)})


class SessionView(APIView):
    """
    Endpoint for authenticated frontends to inspect the current session state and user identity.
    """
    def get(self, request):
        """
        Return the serialized profile of the currently logged-in user and session expiry date.

        Args:
            request (Request): Authenticated HTTP request.

        Returns:
            Response: Current user details and session expiration timestamp.
        """
        return Response({
            'user': UserSerializer(request.user).data,
            'expires_at': request.session.get_expiry_date(),
        })


class LogoutView(APIView):
    """
    Terminate the authenticated user's session and clear server-side session stores.
    """
    def post(self, request):
        """
        Destroy session state and log the user out.

        Args:
            request (Request): Authenticated HTTP request.

        Returns:
            Response: Empty response with HTTP 204 No Content.
        """
        AuthenticationService.logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PasswordResetRequestView(APIView):
    """
    Public rate-limited endpoint to initiate password recovery via email OTP.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = 'password_reset_request'

    def post(self, request):
        """
        Dispatch a one-time verification password reset code to the account's registered email.

        Args:
            request (Request): Request containing account 'identifier'.

        Returns:
            Response: Generic confirmation response indicating delivery attempt.
        """
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        request_password_reset(serializer.validated_data['identifier'])
        return Response({
            'account_exists': True,
            'code_sent': True,
            'resend_after': 60,
            'message': 'A verification code has been sent to the account email.',
        })


class PasswordResetVerifyView(APIView):
    """
    Public rate-limited endpoint to verify the 6-digit OTP code received via email.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = 'password_reset_verify'

    def post(self, request):
        """
        Verify submitted OTP code and exchange it for a temporary password reset token.

        Args:
            request (Request): Payload with 'identifier' and 'otp_code'.

        Returns:
            Response: JSON containing {'reset_token': '<token>'}.

        Raises:
            ValidationError: If the code is invalid, expired, or locked.
        """
        serializer = PasswordResetVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = verify_password_reset_otp(**serializer.validated_data)
        if token is None:
            raise ValidationError({'otp_code': 'Invalid or expired verification code.'})
        return Response({'reset_token': str(token)})


class PasswordResetConfirmView(APIView):
    """
    Public rate-limited endpoint to set a new password using a verified reset token.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = 'password_reset_confirm'

    def post(self, request):
        """
        Apply new password for the account associated with the verified reset token.

        Args:
            request (Request): Payload with 'reset_token' and 'new_password'.

        Returns:
            Response: Confirmation message that password has been successfully reset.
        """
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        confirm_password_reset(**serializer.validated_data, request=request)
        return Response({'message': 'Password has been reset.'})

