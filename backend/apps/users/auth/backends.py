"""Session authentication backend for the UserData model."""

from rest_framework.authentication import SessionAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.core.exceptions import ValidationError
from django.utils.crypto import constant_time_compare

from api.models import UserData


class UserSessionAuthentication(SessionAuthentication):
    def authenticate(self, request):
        user_id = request.session.get('user_id')
        if not user_id:
            return None
        try:
            user = UserData.objects.select_related('role_link', 'department_link').filter(pk=user_id).first()
        except ValidationError:
            user = None
        if user is None or user.account_status != 'active' or not constant_time_compare(
            request.session.get('_user_auth_hash', ''), user.get_session_auth_hash()
        ):
            request.session.flush()
            raise AuthenticationFailed('Session expired or account inactive.')
        self.enforce_csrf(request)
        return user, None

    def authenticate_header(self, request):
        return 'Session'
