from django.db.models import Q

from api.models import Task
from apps.core.filtering import parse_filters


def filter_tasks(queryset, params):
    values = parse_filters(
        params, ids=('project', 'project_id', 'sprint', 'feature', 'milestone', 'assigned_to'),
        dates=('due_date_from', 'due_date_to', 'created_at_from', 'created_at_to'),
        choices={'status': dict(Task.STATUS_CHOICES)},
        ordering=('Task_Name', 'Due_Date', 'created_at', 'updated_at', 'status'),
    )
    fields = {'project': 'project_id', 'project_id': 'project_id', 'sprint': 'sprint_id',
              'feature': 'feature_id', 'milestone': 'feature__Milestone_id',
              'assigned_to': 'assigned_to_id'}
    for param, field in fields.items():
        if param in values:
            queryset = queryset.filter(**{field: values[param]})
    if 'status' in values:
        queryset = queryset.filter(status=values['status'])
    for param, field in (('due_date_from', 'Due_Date__gte'), ('due_date_to', 'Due_Date__lte'),
                         ('created_at_from', 'created_at__date__gte'), ('created_at_to', 'created_at__date__lte')):
        if param in values:
            queryset = queryset.filter(**{field: values[param]})
    if values['search']:
        queryset = queryset.filter(Q(Task_Name__icontains=values['search']) |
                                   Q(description__icontains=values['search']))
    return queryset.order_by(values.get('ordering', 'pk'), 'pk')
