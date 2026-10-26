from django.db.models import Q

from api.models import Task
from apps.core.filtering import parse_filters


def filter_tasks(queryset, params):
    """
    Apply validated filters, search query, and sorting order to a Task queryset.

    Supported filters:
      - 'project' / 'project_id': Project UUID.
      - 'sprint': Sprint UUID.
      - 'feature': Milestone_Features UUID.
      - 'milestone': Milestone UUID (via feature__Milestone_id).
      - 'assigned_to': Assignee UserData UUID.
      - 'status': Task status choice ('yet_to_start', 'in_progress', 'completed', etc.).
      - Date ranges: 'due_date_from', 'due_date_to', 'created_at_from', 'created_at_to'.
      - 'search': Case-insensitive matching across Task_Name and description.
      - 'ordering': Sort fields ('Task_Name', 'Due_Date', 'created_at', 'updated_at', 'status').

    Args:
        queryset (QuerySet[Task]): Base task queryset.
        params (QueryDict|dict): Incoming HTTP query parameters.

    Returns:
        QuerySet[Task]: Filtered and ordered Task queryset.
    """
    values = parse_filters(
        params, ids=('project', 'project_id', 'sprint', 'feature', 'milestone', 'assigned_to'),
        dates=('due_date_from', 'due_date_to', 'created_at_from', 'created_at_to'),
        choices={'status': dict(Task.STATUS_CHOICES), 'priority': ('low', 'medium', 'high')},
        ordering=('Task_Name', 'Due_Date', 'created_at', 'updated_at', 'status'),
    )
    fields = {'project': 'project_id', 'project_id': 'project_id', 'sprint': 'sprint_id',
              'feature': 'feature_id',
              'assigned_to': 'assigned_to_id'}
    for param, field in fields.items():
        if param in values:
            queryset = queryset.filter(**{field: values[param]})
    if 'milestone' in values:
        milestone = values['milestone']
        queryset = queryset.filter(Q(feature__Milestone_id=milestone) |
            Q(Remarks__iregex=rf'"milestone_id"\s*:\s*"{milestone}"'))
    if 'status' in values:
        queryset = queryset.filter(status=values['status'])
    if 'priority' in values:
        priority = values['priority']
        if priority == 'medium':
            queryset = queryset.exclude(Remarks__iregex=r'"priority"\s*:\s*"(low|high)"')
        else:
            queryset = queryset.filter(Remarks__iregex=rf'"priority"\s*:\s*"{priority}"')
    for param, field in (('due_date_from', 'Due_Date__gte'), ('due_date_to', 'Due_Date__lte'),
                         ('created_at_from', 'created_at__date__gte'), ('created_at_to', 'created_at__date__lte')):
        if param in values:
            queryset = queryset.filter(**{field: values[param]})
    if values['search']:
        queryset = queryset.filter(Q(Task_Name__icontains=values['search']) |
                                   Q(description__icontains=values['search']))
    return queryset.order_by(values.get('ordering', 'pk'), 'pk')

