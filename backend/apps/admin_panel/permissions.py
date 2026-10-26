"""
Admin Panel Permissions
~~~~~~~~~~~~~~~~~~~~~~~

Reusable DRF permission class that gates every admin endpoint exclusively
to authenticated, active Administrator accounts.
"""

from rest_framework.permissions import BasePermission
from apps.roles.permissions import is_admin, has_permission
from django.utils.text import slugify


class IsAdminUser(BasePermission):
    """
    Allow access only to active Administrator users.

    Any other authenticated user (Project Manager, Regular User, etc.)
    or unauthenticated request is rejected with 403 Forbidden.
    """

    message = 'Administrator access required.'

    def has_permission(self, request, view):
        return bool(request.user and is_admin(request.user))


class CanReadAuditLogs(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.account_status == 'active' and (
            is_admin(user) or slugify(user.role) in ('pm', 'project-manager') or
            has_permission(user, 'Audit Logs', 'View')))
