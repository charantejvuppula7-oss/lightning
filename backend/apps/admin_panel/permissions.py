"""Unlisted monitoring features are available to active authenticated users."""

from rest_framework.permissions import BasePermission
from apps.roles.permissions import has_permission


class CanAccessMonitoring(BasePermission):
    def has_permission(self, request, view):
        return has_permission(request.user, 'Monitoring', 'View')


class CanReadAuditLogs(BasePermission):
    def has_permission(self, request, view):
        return has_permission(request.user, 'Audit Logs', 'View')
