"""Session authentication backend for the UserData model."""

from rest_framework.authentication import SessionAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.core.exceptions import ValidationError
from django.utils.crypto import constant_time_compare

from api.models import UserData


class UserSessionAuthentication(SessionAuthentication):
    """
    Custom DRF SessionAuthentication backend tailored for UserData.

    Validates that:
      1. A valid 'user_id' exists in session data.
      2. The user account is active.
      3. The stored session authentication hash matches the user's password hash
         (invalidating existing sessions automatically whenever password changes).
      4. CSRF protection is strictly enforced for mutating requests.
    """
    def authenticate(self, request):
        """
        Authenticate the request based on session cookies.

        Args:
            request (HttpRequest): Incoming Django request.

        Returns:
            tuple[UserData, None]|None: (user, None) if authenticated, None if no session exists.

        Raises:
            AuthenticationFailed: If session is corrupted, account inactive, or password hash changed.
        """
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
        """Return the WWW-Authenticate header challenge value."""
        return 'Session'

