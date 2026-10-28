"""Monitoring is admin-only; project managers may also read audit logs."""

from rest_framework.permissions import BasePermission
from apps.roles.permissions import is_admin
from django.utils.text import slugify


class CanAccessMonitoring(BasePermission):
    def has_permission(self, request, view):
        return is_admin(request.user)


class CanReadAuditLogs(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.account_status == 'active' and (
            is_admin(user) or user.role_link_id and
            slugify(user.role_link.name.replace('_', ' ')) in ('pm', 'project-manager')))
