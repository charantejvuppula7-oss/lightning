"""Authentication HTTP views — CSRF, login, session, logout."""

from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
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
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({'csrfToken': get_token(request)})


@method_decorator(csrf_protect, name='dispatch')
class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get_authenticate_header(self, request):
        return 'Session'

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = AuthenticationService.login(request, **serializer.validated_data)
        return Response({'user': UserSerializer(user).data, 'csrfToken': get_token(request)})


class SessionView(APIView):
    def get(self, request):
        return Response({
            'user': UserSerializer(request.user).data,
            'expires_at': request.session.get_expiry_date(),
        })


class LogoutView(APIView):
    def post(self, request):
        AuthenticationService.logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset_request'

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        request_password_reset(serializer.validated_data['identifier'])
        return Response({
            'account_exists': True,
            'code_sent': True,
            'message': 'A verification code has been sent to the account email.',
        })


class PasswordResetVerifyView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset_verify'

    def post(self, request):
        serializer = PasswordResetVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = verify_password_reset_otp(**serializer.validated_data)
        if token is None:
            raise ValidationError({'otp_code': 'Invalid or expired verification code.'})
        return Response({'reset_token': str(token)})


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset_confirm'

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        confirm_password_reset(**serializer.validated_data, request=request)
        return Response({'message': 'Password has been reset.'})
