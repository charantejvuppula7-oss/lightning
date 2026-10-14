from django.db.models import Q

from api.models import UserData
from apps.core.filtering import parse_filters


def filter_users(queryset, params):
    """
    Apply validated search, filter, and ordering parameters to a UserData queryset.

    Supported filters:
      - 'role': Role UUID.
      - 'department': Department UUID.
      - 'project': Project UUID (matches default, assigned, managed, or created projects).
      - 'status': Account status choice ('active', 'inactive', 'suspended').
      - 'is_active': Boolean flag ('true'/'false') mapped to status.
      - 'search': Case-insensitive substring matching username, first/last name, email, or employee ID.
      - 'ordering': Allowed sorting fields ('user_name', 'first_name', 'last_name', 'email', 'created_at', 'updated_at').

    Args:
        queryset (QuerySet[UserData]): Base user queryset.
        params (QueryDict|dict): Incoming HTTP query parameters.

    Returns:
        QuerySet[UserData]: Filtered, distinct, and ordered user queryset.
    """
    values = parse_filters(
        params, ids=('role', 'department', 'project'),
        choices={'status': dict(UserData.ACCOUNT_STATUS)},
        booleans=('is_active',),
        ordering=('user_name', 'first_name', 'last_name', 'email', 'created_at', 'updated_at'),
    )
    if 'role' in values:
        queryset = queryset.filter(role_link_id=values['role'])
    if 'department' in values:
        queryset = queryset.filter(department_link_id=values['department'])
    if 'project' in values:
        queryset = queryset.filter(Q(default_projects__id=values['project']) |
                                   Q(assigned_projects__id=values['project']) |
                                   Q(managed_projects__id=values['project']) |
                                   Q(projects__id=values['project']))
    if 'status' in values:
        queryset = queryset.filter(account_status=values['status'])
    if 'is_active' in values:
        queryset = queryset.filter(account_status='active' if values['is_active'] else 'inactive')
    if values['search']:
        queryset = queryset.filter(Q(user_name__icontains=values['search']) |
                                   Q(first_name__icontains=values['search']) |
                                   Q(last_name__icontains=values['search']) |
                                   Q(email__icontains=values['search']) |
                                   Q(employee_id__icontains=values['search']))
    return queryset.distinct().order_by(values.get('ordering', 'pk'), 'pk')

