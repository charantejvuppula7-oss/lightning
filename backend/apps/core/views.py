from django.db import connection
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.roles.permissions import ResourcePermission, scope_queryset
from apps.audit.services import LogService


class ResourceAPIView(APIView):
    """
    Base API view for protected domain resources in the application.

    Enforces authentication and role-based permissions (`ResourcePermission`),
    scopes querysets to the authenticated user's allowed projects/data,
    and provides centralized methods for fetching locked objects and recording
    audit trails.
    """
    permission_classes = [IsAuthenticated, ResourcePermission]
    audit_entity = None

    def authorized_queryset(self, request):
        """
        Return the queryset filtered to records accessible by the requesting user.

        Args:
            request (Request): The incoming DRF request object containing the user.

        Returns:
            QuerySet: Filtered Django queryset adhering to the user's role scope.
        """
        return scope_queryset(request.user, self.resource, self.queryset)

    def authorized_object(self, request, object_id, *, lock=False):
        """
        Retrieve a single authorized entity by its primary key, optionally locking it.

        Args:
            request (Request): Incoming DRF request.
            object_id (UUID|int|str): Primary key of the requested resource.
            lock (bool): If True and supported by the database engine, applies
                        `select_for_update()` to prevent concurrent modification race conditions.

        Returns:
            Model: The retrieved and permission-verified model instance.

        Raises:
            Http404: If the object does not exist or falls outside the user's scope.
            PermissionDenied: If object-level permissions fail.
        """
        queryset = self.authorized_queryset(request)
        instance = get_object_or_404(queryset, pk=object_id)
        if lock and connection.features.has_select_for_update:
            locked_qs = self.queryset.filter(pk=instance.pk)
            if getattr(connection.features, 'has_select_for_update_of', False):
                locked_qs = locked_qs.select_for_update(of=('self',))
            else:
                locked_qs = locked_qs.select_for_update()
            instance = locked_qs.get()
        self.check_object_permissions(request, instance)
        return instance

    def audit(self, request, instance, action, **changes):
        """
        Record an immutable audit log entry for changes made to this resource.

        Args:
            request (Request): The current HTTP request containing actor and IP metadata.
            instance (Model): The model entity being created, modified, or deleted.
            action (str): The lifecycle action ('created', 'updated', 'deleted').
            **changes: Additional keyword arguments containing before/after diffs or metadata.
        """
        LogService.log_audit_event(
            actor=request.user, action=action,
            entity_type=self.audit_entity or self.resource,
            entity=instance, request=request, **changes,
        )

