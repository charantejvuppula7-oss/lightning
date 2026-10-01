from django.db import connection
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.roles.permissions import ResourcePermission, scope_queryset
from apps.audit.services import LogService


class ResourceAPIView(APIView):
    permission_classes = [IsAuthenticated, ResourcePermission]
    audit_entity = None

    def authorized_queryset(self, request):
        return scope_queryset(request.user, self.resource, self.queryset)

    def authorized_object(self, request, object_id, *, lock=False):
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
        LogService.log_audit_event(
            actor=request.user, action=action,
            entity_type=self.audit_entity or self.resource,
            entity=instance, request=request, **changes,
        )
