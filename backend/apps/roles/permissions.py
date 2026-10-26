"""One permission schema and the resource scope rules used by API views."""

from uuid import UUID

from django.db.models import Q
from django.utils.text import slugify
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission

from api.models import Project, Role, UserData


MODULE_ACTIONS = {
    'Dashboard': ('View', 'Create', 'Edit', 'Delete'),
    'Audit Logs': ('View', 'Create', 'Edit', 'Delete'),
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
    """
    Check if a user is an authenticated active administrator.

    Args:
        user (UserData): The user object to evaluate.

    Returns:
        bool: True if the user has an active account and an 'admin' or 'administrator' role.
    """
    return bool(user and getattr(user, 'is_authenticated', False) and
                getattr(user, 'account_status', None) == 'active' and user.role_link_id and
                slugify(user.role_link.name) in ('admin', 'administrator'))


def resolve_role_object(value):
    """
    Resolve a role object from either a model instance, UUID string, or role name.

    Args:
        value (Role|str|UUID): Identifier, instance, or name of the Role.

    Returns:
        Role|None: Resolved Role instance or None if not found.
    """
    if isinstance(value, Role):
        return value
    value = str(value).strip()
    try:
        role = Role.objects.filter(pk=UUID(value)).first()
    except (ValueError, TypeError):
        role = None
    return role or Role.objects.filter(name__iexact=value).first()


def permission_value(permissions, resource, action):
    """
    Evaluate whether a specific action is granted within the canonical nested permissions structure.

    Args:
        permissions (dict): The role's JSON permissions dictionary.
        resource (str): The domain resource identifier (e.g. 'task', 'project').
        action (str): The canonical action ('read', 'create', 'update', 'delete').

    Returns:
        bool: True if explicitly granted with True, otherwise False.
    """
    module = RESOURCE_MODULES.get(resource, resource)
    label = ACTION_NAMES.get(action, action)
    if module not in MODULE_ACTIONS or label not in MODULE_ACTIONS[module]:
        return False
    values = permissions.get(module) if isinstance(permissions, dict) else None
    return isinstance(values, dict) and values.get(label) is True


def has_permission(user, resource, action):
    """
    Verify whether a user holds permission to perform an action on a given resource.

    Superusers and active admins automatically bypass checks and are granted permission.

    Args:
        user (UserData): The user attempting the action.
        resource (str): The target resource name.
        action (str): The action name ('read', 'create', 'update', 'delete').

    Returns:
        bool: True if authorized, False otherwise.
    """
    if (not user or not getattr(user, 'is_authenticated', False) or
            getattr(user, 'account_status', None) != 'active' or not user.role_link_id):
        return False
    if is_admin(user):
        return True
    return permission_value(user.role_link.permissions, resource, action)


def effective_permissions(user):
    """
    Compute a dictionary of all effective permissions across every module for a given user.

    Useful for frontend initialization payloads so UI components can conditionally render.

    Args:
        user (UserData): The user to compute effective permissions for.

    Returns:
        dict[str, dict[str, bool]]: Module to action-boolean mapping.
    """
    assigned = user.role_link.permissions if user.role_link_id else {}
    if is_admin(user):
        return {module: {action: True for action in actions}
                for module, actions in MODULE_ACTIONS.items()}
    return {module: {action: permission_value(assigned, module, action)
                     for action in actions}
            for module, actions in MODULE_ACTIONS.items()}


def require_permission(user, resource, action, project=None):
    """
    Enforce that a user holds permission for a resource action, optionally checking project scope.

    Args:
        user (UserData): The acting user.
        resource (str): Target resource name.
        action (str): Action name.
        project (Project|None): Optional project to verify membership/ownership against.

    Raises:
        PermissionDenied: If permission is not granted or project scope is violated.
    """
    if not has_permission(user, resource, action):
        raise PermissionDenied('Access denied.')
    if project is not None:
        require_project_scope(user, project)


def assigned_projects(user):
    """
    Retrieve all projects that a non-admin user is associated with (creator, manager, or member).

    Args:
        user (UserData): The user whose assigned projects are queried.

    Returns:
        QuerySet[Project]: Distinct project queryset.
    """
    return Project.objects.filter(
        Q(created_by=user) | Q(project_managers=user) |
        Q(team_members=user) | Q(members=user)
    ).distinct()


def allowed_projects(user):
    """
    Retrieve all projects accessible by a user. Admins access all; others access assigned only.

    Args:
        user (UserData): Acting user.

    Returns:
        QuerySet[Project]: Accessible projects queryset.
    """
    return Project.objects.all() if is_admin(user) else assigned_projects(user)


def scope_queryset(user, resource, queryset):
    """
    Filter accessible records before list pagination or direct object lookup based on RBAC rules.

    Args:
        user (UserData): Acting user.
        resource (str): Resource identifier ('project', 'task', 'user', 'role', etc.).
        queryset (QuerySet): Initial unfiltered model queryset.

    Returns:
        QuerySet: Filtered queryset restricted to the user's project or managerial scope.
    """
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
    """
    Ensure a specified project falls within the user's permitted project scope.

    Args:
        user (UserData): The acting user.
        project (Project): The project instance to verify.

    Raises:
        PermissionDenied: If the project is outside the user's authorized scope.
    """
    if not allowed_projects(user).filter(pk=project.pk).exists():
        raise PermissionDenied('Project outside your scope.')


def require_object_access(user, resource, action, instance, data):
    """
    Perform fine-grained, object-level business rule checks on mutations.

    Enforces restrictions such as preventing non-admins from modifying admin roles,
    preventing users from self-deleting accounts, and restricting task status updates
    to assigned workers or designated reviewers.

    Args:
        user (UserData): Acting user.
        resource (str): Resource name ('role', 'task', 'user', etc.).
        action (str): Action ('update', 'delete', etc.).
        instance (Model): The target model instance.
        data (dict): Incoming mutation data.

    Raises:
        PermissionDenied: If any object-level authorization invariant is violated.
    """
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
    """
    Prevent delegated role managers from granting powers they do not personally hold (privilege escalation check).

    Args:
        actor (UserData): The user creating or modifying the role.
        permissions (dict): The target permissions dictionary to assign.

    Raises:
        PermissionDenied: If the actor tries to grant an action they do not hold.
    """
    if is_admin(actor):
        return
    for module, actions in permissions.items():
        for action, enabled in actions.items():
            if enabled and not has_permission(actor, module, action):
                raise PermissionDenied('Cannot grant a permission you do not hold.')


def require_role_assignment(actor, role):
    """
    Ensure an actor is authorized to assign a specific role to a user.

    Args:
        actor (UserData): The acting user assigning the role.
        role (Role|None): The role being assigned.

    Raises:
        PermissionDenied: If role is None, is an admin role assigned by non-admin,
                          or contains permissions exceeding actor's permissions.
    """
    if role is None:
        raise PermissionDenied('Cannot remove the assigned role.')
    if is_admin(actor):
        return
    if slugify(role.name) in ('admin', 'administrator'):
        raise PermissionDenied('Cannot assign the administrator role.')
    require_role_grant(actor, role.permissions)


def is_task_status_update(data):
    """
    Check if a request payload exclusively intends to update task status.

    Args:
        data (dict): The request payload dictionary.

    Returns:
        bool: True if the payload keys only contain 'status' or 'Status'.
    """
    return set(data) in ({'status'}, {'Status'})


def require_user_relationships(actor, data, instance=None):
    """
    Validate relational modifications when creating or editing a user account.

    Guarantees non-admins cannot elevate their own role, assign managers outside their scope,
    or assign projects they do not participate in.

    Args:
        actor (UserData): The acting user performing the change.
        data (dict): The validated serializer data.
        instance (UserData|None): The target user instance being edited, if applicable.

    Raises:
        PermissionDenied: If any relationship constraint is violated.
    """
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


def require_project_members(actor, data, project=None):
    """
    Validate that team members and managers assigned to a project fall within the actor's scope.

    Args:
        actor (UserData): The acting user creating or updating project team members.
        data (dict): Serializer payload containing 'team_members' or 'project_managers'.

    Raises:
        PermissionDenied: If non-admin attempts to assign members outside their management.
    """
    if is_admin(actor):
        return
    existing = set()
    if project and (project.created_by_id == actor.pk or project.project_managers.filter(pk=actor.pk).exists()):
        existing = set(project.team_members.values_list('pk',flat=True)) | set(project.project_managers.values_list('pk',flat=True)) | {project.created_by_id}
    for field in ('team_members', 'project_managers'):
        if any(user.pk != actor.pk and user.manager_id != actor.pk and user.pk not in existing for user in data.get(field, [])):
            raise PermissionDenied('User outside your scope.')


class ResourcePermission(BasePermission):
    """
    DRF permission class implementing fine-grained resource and object-level authorization.

    Inspects the HTTP method, maps it to a canonical action ('read', 'create', 'update', 'delete'),
    and queries the RBAC engine for verification.
    """
    ACTIONS = {
        'GET': 'read', 'HEAD': 'read', 'OPTIONS': 'read',
        'POST': 'create', 'PUT': 'update', 'PATCH': 'update', 'DELETE': 'delete',
    }

    def has_permission(self, request, view):
        """
        Verify view-level permission based on HTTP method and target view resource.

        Args:
            request (Request): DRF request.
            view (APIView): Target view declaring `resource`.

        Returns:
            bool: True if authorized.
        """
        require_permission(request.user, view.resource, self.ACTIONS[request.method])
        return True

    def has_object_permission(self, request, view, obj):
        """
        Verify object-level permission before mutating a specific entity.

        Args:
            request (Request): DRF request.
            view (APIView): Target view declaring `resource`.
            obj (Model): Target model entity.

        Returns:
            bool: True if authorized.
        """
        data = request.data if request.method in ('PUT', 'PATCH') else {}
        require_object_access(request.user, view.resource, self.ACTIONS[request.method], obj, data)
        return True

