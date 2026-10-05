from django.utils.text import slugify
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied

from api.models import Role
from apps.roles.permissions import MODULE_ACTIONS, is_admin, require_role_grant


class RoleSerializer(serializers.ModelSerializer):
    """
    Serializer for the Role model handling name uniqueness and permission schema validation.
    """
    class Meta:
        model = Role
        fields = ('id', 'name', 'description', 'color', 'is_locked', 'permissions')
        read_only_fields = ('id',)

    def validate_name(self, value):
        """
        Validate role name uniqueness and protect reserved administrator roles.

        Args:
            value (str): The provided role name.

        Returns:
            str: Stripped role name.

        Raises:
            ValidationError: If name is empty, duplicate, or renames reserved admin roles.
            PermissionDenied: If non-admin tries to create an admin role.
        """
        name = value.strip()
        if not name:
            raise serializers.ValidationError('Role name is required.')
        matching = Role.objects.filter(name__iexact=name)
        if self.instance:
            matching = matching.exclude(pk=self.instance.pk)
        if matching.exists():
            raise serializers.ValidationError('Role name already exists.')
        actor = self.context['request'].user
        if slugify(name) in ('admin', 'administrator') and (
            self.instance is None or slugify(self.instance.name) not in ('admin', 'administrator')
        ):
            raise PermissionDenied('Administrator role names are reserved.')
        if self.instance and slugify(self.instance.name) in ('admin', 'administrator') and name != self.instance.name:
            raise serializers.ValidationError('Administrator role cannot be renamed.')
        return name

    def validate_permissions(self, value):
        """
        Verify that permissions conform to valid system modules and actions without privilege escalation.

        Args:
            value (dict): Dictionary mapping modules to action boolean maps.

        Returns:
            dict: Validated permissions structure.

        Raises:
            ValidationError: If structure is malformed or invalid module/action is referenced.
            PermissionDenied: If user tries to grant permissions they do not possess.
        """
        if not isinstance(value, dict):
            raise serializers.ValidationError('Permissions must be an object.')
        errors = {}
        for module, actions in value.items():
            if module not in MODULE_ACTIONS or not isinstance(actions, dict):
                errors[module] = 'Unknown module or invalid action object.'
                continue
            for action, enabled in actions.items():
                if action not in MODULE_ACTIONS[module] or not isinstance(enabled, bool):
                    errors[f'{module}.{action}'] = 'Unknown action or non-boolean value.'
        if errors:
            raise serializers.ValidationError(errors)
        require_role_grant(self.context['request'].user, value)
        return value

    def validate(self, attrs):
        """
        Enforce permissions on role locking.

        Args:
            attrs (dict): Serializer validated attributes.

        Returns:
            dict: Validated attributes.

        Raises:
            PermissionDenied: If non-admin attempts to lock a role.
        """
        if attrs.get('is_locked') and not is_admin(self.context['request'].user):
            raise PermissionDenied('Only an administrator can lock roles.')
        return attrs

