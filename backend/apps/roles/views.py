from django.db import transaction
from django.db.models import Count
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from api.models import Role, UserData
from apps.core.pagination import ResourcePagination
from apps.roles.permissions import MODULE_ACTIONS
from apps.roles.serializers import RoleSerializer
from apps.core.views import ResourceAPIView


class RoleSchemaView(ResourceAPIView):
    """
    Endpoint providing the complete schema of permission modules and allowable actions.
    """
    resource = 'role'

    def get(self, request):
        """
        Return the dictionary of system modules and their supported action labels.

        Args:
            request (Request): Incoming DRF HTTP request.

        Returns:
            Response: JSON mapping module names to lists of available action strings.
        """
        return Response({module: list(actions) for module, actions in MODULE_ACTIONS.items()})


class RoleListCreateView(ResourceAPIView):
    """
    List existing roles or create a new custom role.
    """
    resource = 'role'
    queryset = Role.objects.annotate(user_count=Count('userdata'))

    def get(self, request):
        """
        List roles ordered by name with standard pagination.

        Args:
            request (Request): Incoming DRF HTTP request.

        Returns:
            Response: Paginated list of serialized roles.
        """
        queryset = self.authorized_queryset(request).order_by('name')
        paginator = ResourcePagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(RoleSerializer(page, many=True).data)

    def post(self, request):
        """
        Create a new system role and record an audit log event.

        Args:
            request (Request): Incoming DRF HTTP request with role definition payload.

        Returns:
            Response: Serialized created role with HTTP 201 Created status.
        """
        serializer = RoleSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            instance = serializer.save()
            self.audit(request, instance, 'created',
                       new_values={'name': instance.name, 'permissions': instance.permissions})
        return Response(RoleSerializer(instance).data, status=status.HTTP_201_CREATED)


class RoleDetailView(ResourceAPIView):
    """
    Retrieve, update, or delete a specific role entity.
    """
    resource = 'role'
    queryset = Role.objects.all()

    def get(self, request, role_id):
        """
        Retrieve details of a single role by ID.

        Args:
            request (Request): Incoming DRF request.
            role_id (UUID): Primary key of the role.

        Returns:
            Response: Serialized role details.
        """
        instance = self.authorized_object(request, role_id)
        return Response(RoleSerializer(instance).data)

    def put(self, request, role_id):
        """
        Replace all fields of an existing role within an atomic transaction.

        Args:
            request (Request): Incoming request with full role payload.
            role_id (UUID): Role identifier.

        Returns:
            Response: Serialized updated role.
        """
        with transaction.atomic():
            instance = self.authorized_object(request, role_id, lock=True)
            before = {'name': instance.name, 'permissions': instance.permissions}
            serializer = RoleSerializer(instance, data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            instance = serializer.save()
            self.audit(request, instance, 'updated', old_values=before,
                       new_values={'name': instance.name, 'permissions': instance.permissions})
        return Response(RoleSerializer(instance).data)

    def patch(self, request, role_id):
        """
        Partially update an existing role within an atomic transaction.

        Args:
            request (Request): Incoming request with partial role payload.
            role_id (UUID): Role identifier.

        Returns:
            Response: Serialized updated role.
        """
        with transaction.atomic():
            instance = self.authorized_object(request, role_id, lock=True)
            before = {'name': instance.name, 'permissions': instance.permissions}
            serializer = RoleSerializer(instance, data=request.data, partial=True, context={'request': request})
            serializer.is_valid(raise_exception=True)
            instance = serializer.save()
            self.audit(request, instance, 'updated', old_values=before,
                       new_values={'name': instance.name, 'permissions': instance.permissions})
        return Response(RoleSerializer(instance).data)

    def delete(self, request, role_id):
        """
        Delete a role, preventing deletion if currently assigned to any active user accounts.

        Args:
            request (Request): Incoming request.
            role_id (UUID): Role identifier.

        Returns:
            Response: Empty response with HTTP 204 No Content.

        Raises:
            ValidationError: If any user accounts are currently linked to this role.
        """
        with transaction.atomic():
            instance = self.authorized_object(request, role_id, lock=True)
            if UserData.objects.filter(role_link=instance).exists():
                raise ValidationError({'detail': 'Role is assigned to users.'})
            self.audit(request, instance, 'deleted',
                       old_values={'name': instance.name, 'permissions': instance.permissions})
            instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

