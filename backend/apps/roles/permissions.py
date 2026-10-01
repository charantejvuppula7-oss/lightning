"""One permission schema and the resource scope rules used by API views."""

from uuid import UUID

from django.db.models import Q
from django.utils.text import slugify
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission

from api.models import Project, Role, UserData


MODULE_ACTIONS = {
    'Tasks': ('View', 'Create', 'Edit', 'Delete'),
    'Features': ('View', 'Create', 'Edit', 'Delete'),
    'Milestones': ('View', 'Create', 'Edit', 'Delete'),
    'Reports': ('View', 'Create', 'Edit', 'Delete'),
    'Projects': ('View', 'Create', 'Edit', 'Delete'),
    'Documents': ('View', 'Create', 'Edit', 'Delete'),
    'Dependencies': ('View', 'Create', 'Edit', 'Delete'),
    'User Management': ('View', 'Create', 'Edit', 'Delete'),
    'Roles & permissions': ('View', 'Create', 'Edit', 'Delete'),
    'Department Managment': ('View', 'Create', 'Edit', 'Delete'),
    'TeamWorLoad': ('View',),
    'ProjectJourney': ('View',),
    'ProjectPerformanceGraph': ('View',),
    'MilestoneMap': ('View',),
    'TeamStatus': ('View',),
    'recentActvities': ('View',),
}
RESOURCE_MODULES = {
    'task': 'Tasks', 'feature': 'Features', 'milestone': 'Milestones',
    'project': 'Projects', 'sprint': 'Projects', 'dependency': 'Dependencies',
    'user': 'User Management', 'role': 'Roles & permissions',
}
ACTION_NAMES = {'read': 'View', 'create': 'Create', 'update': 'Edit', 'delete': 'Delete'}


def is_admin(user):
    return bool(user and getattr(user, 'is_authenticated', False) and
                getattr(user, 'account_status', None) == 'active' and user.role_link_id and
                slugify(user.role_link.name) in ('admin', 'administrator'))


def resolve_role_object(value):
    if isinstance(value, Role):
        return value
    value = str(value).strip()
    try:
        role = Role.objects.filter(pk=UUID(value)).first()
    except (ValueError, TypeError):
        role = None
    return role or Role.objects.filter(name__iexact=value).first()


def permission_value(permissions, resource, action):
    """Read only the canonical nested permission structure."""
    module = RESOURCE_MODULES.get(resource, resource)
    label = ACTION_NAMES.get(action, action)
    if module not in MODULE_ACTIONS or label not in MODULE_ACTIONS[module]:
        return False
    values = permissions.get(module) if isinstance(permissions, dict) else None
    return isinstance(values, dict) and values.get(label) is True


def has_permission(user, resource, action):
    if (not user or not getattr(user, 'is_authenticated', False) or
            getattr(user, 'account_status', None) != 'active' or not user.role_link_id):
        return False
    if is_admin(user):
        return True
    return permission_value(user.role_link.permissions, resource, action)


def effective_permissions(user):
    assigned = user.role_link.permissions if user.role_link_id else {}
    if is_admin(user):
        return {module: {action: True for action in actions}
                for module, actions in MODULE_ACTIONS.items()}
    return {module: {action: permission_value(assigned, module, action)
                     for action in actions}
            for module, actions in MODULE_ACTIONS.items()}


def require_permission(user, resource, action, project=None):
    if not has_permission(user, resource, action):
        raise PermissionDenied('Access denied.')
    if project is not None:
        require_project_scope(user, project)


def assigned_projects(user):
    return Project.objects.filter(
        Q(created_by=user) | Q(project_managers=user) |
        Q(team_members=user) | Q(members=user)
    ).distinct()


def allowed_projects(user):
    return Project.objects.all() if is_admin(user) else assigned_projects(user)


def scope_queryset(user, resource, queryset):
    """Filter accessible records before list pagination or direct object lookup."""
    if resource == 'role':
        return queryset
    projects = allowed_projects(user)
    if resource == 'project':
        return queryset.filter(pk__in=projects.values('pk'))
    if resource == 'feature':
        return queryset.filter(Milestone__project__in=projects)
    if resource == 'dependency':
        return queryset.filter(task__project__in=projects)
    if resource == 'user':
        if is_admin(user):
            return queryset
        scoped_ids = UserData.objects.filter(
            Q(pk=user.pk) | Q(manager=user) | Q(default_projects__in=projects)
        ).values('pk')
        return queryset.filter(pk__in=scoped_ids)
    queryset = queryset.filter(project__in=projects)
    if resource == 'task' and not is_admin(user):
        queryset = queryset.filter(
            Q(project__created_by=user) | Q(project__project_managers=user) |
            Q(assigned_to=user) | Q(review_by=user)
        ).distinct()
    return queryset


def require_project_scope(user, project):
    if not allowed_projects(user).filter(pk=project.pk).exists():
        raise PermissionDenied('Project outside your scope.')


def require_object_access(user, resource, action, instance, data):
    if resource == 'role' and action in ('update', 'delete'):
        protected = slugify(instance.name) in ('admin', 'administrator')
        if action == 'delete' and protected:
            raise PermissionDenied('Cannot delete the administrator role.')
        if not is_admin(user) and (protected or instance.is_locked):
            raise PermissionDenied('Protected role.')
    if resource == 'task' and action == 'update' and not is_admin(user):
        manages_project = (instance.project.created_by_id == user.pk or
                           instance.project.project_managers.filter(pk=user.pk).exists())
        if not manages_project:
            assigned = instance.assigned_to_id == user.pk
            reviewing = instance.review_by_id == user.pk and data.get('status', data.get('Status')) == 'completed'
            if (data.get('status', data.get('Status')) == 'completed' and
                    instance.review_by_id and not reviewing):
                raise PermissionDenied('Only the assigned reviewer can complete this task.')
            if not is_task_status_update(data) or not (assigned or reviewing):
                raise PermissionDenied('Only assigned task status may be updated.')
    if resource == 'user' and action in ('update', 'delete'):
        if action == 'delete' and instance.pk == user.pk:
            raise PermissionDenied('Cannot delete your own account.')
        if not is_admin(user) and is_admin(instance):
            raise PermissionDenied('Protected account.')


def require_role_grant(actor, permissions):
    """Prevent delegated role managers from granting powers they do not hold."""
    if is_admin(actor):
        return
    for module, actions in permissions.items():
        for action, enabled in actions.items():
            if enabled and not has_permission(actor, module, action):
                raise PermissionDenied('Cannot grant a permission you do not hold.')


def require_role_assignment(actor, role):
    if role is None:
        raise PermissionDenied('Cannot remove the assigned role.')
    if is_admin(actor):
        return
    if slugify(role.name) in ('admin', 'administrator'):
        raise PermissionDenied('Cannot assign the administrator role.')
    require_role_grant(actor, role.permissions)


def is_task_status_update(data):
    return set(data) in ({'status'}, {'Status'})


def require_user_relationships(actor, data, instance=None):
    if 'role_link' in data:
        role = data['role_link']
        if instance is not None and instance.pk == actor.pk and role != instance.role_link:
            raise PermissionDenied('Cannot change your own role.')
        require_role_assignment(actor, role)
    if not is_admin(actor):
        manager = data.get('manager')
        if manager is not None and manager.pk != actor.pk:
            raise PermissionDenied('Manager outside your scope.')
        for project in data.get('default_projects', []):
            require_project_scope(actor, project)


def require_project_members(actor, data):
    if is_admin(actor):
        return
    for field in ('team_members', 'project_managers'):
        if any(user.pk != actor.pk and user.manager_id != actor.pk for user in data.get(field, [])):
            raise PermissionDenied('User outside your scope.')


class ResourcePermission(BasePermission):
    ACTIONS = {
        'GET': 'read', 'HEAD': 'read', 'OPTIONS': 'read',
        'POST': 'create', 'PUT': 'update', 'PATCH': 'update', 'DELETE': 'delete',
    }

    def has_permission(self, request, view):
        require_permission(request.user, view.resource, self.ACTIONS[request.method])
        return True

    def has_object_permission(self, request, view, obj):
        data = request.data if request.method in ('PUT', 'PATCH') else {}
        require_object_access(request.user, view.resource, self.ACTIONS[request.method], obj, data)
        return True
