from django.db import transaction
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from api.models import Role, UserData
from apps.core.pagination import ResourcePagination
from apps.roles.permissions import MODULE_ACTIONS
from apps.roles.serializers import RoleSerializer
from apps.core.views import ResourceAPIView


class RoleSchemaView(ResourceAPIView):
    resource = 'role'

    def get(self, request):
        return Response({module: list(actions) for module, actions in MODULE_ACTIONS.items()})


class RoleListCreateView(ResourceAPIView):
    resource = 'role'
    queryset = Role.objects.all()

    def get(self, request):
        queryset = self.authorized_queryset(request).order_by('name')
        paginator = ResourcePagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(RoleSerializer(page, many=True).data)

    def post(self, request):
        serializer = RoleSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            instance = serializer.save()
            self.audit(request, instance, 'created',
                       new_values={'name': instance.name, 'permissions': instance.permissions})
        return Response(RoleSerializer(instance).data, status=status.HTTP_201_CREATED)


class RoleDetailView(ResourceAPIView):
    resource = 'role'
    queryset = Role.objects.all()

    def get(self, request, role_id):
        instance = self.authorized_object(request, role_id)
        return Response(RoleSerializer(instance).data)

    def put(self, request, role_id):
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
        with transaction.atomic():
            instance = self.authorized_object(request, role_id, lock=True)
            if UserData.objects.filter(role_link=instance).exists():
                raise ValidationError({'detail': 'Role is assigned to users.'})
            self.audit(request, instance, 'deleted',
                       old_values={'name': instance.name, 'permissions': instance.permissions})
            instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
