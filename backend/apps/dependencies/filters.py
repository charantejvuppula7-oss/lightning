from django.db.models import Q

from api.models import TaskDependency
from apps.core.filtering import parse_filters


def filter_dependencies(queryset, params):
    values = parse_filters(
        params, ids=('project', 'source_task', 'target_task', 'assigned_to'),
        dates=('due_date_from', 'due_date_to'),
        choices={'status': dict(TaskDependency._meta.get_field('status').choices)},
        ordering=('created_at', 'due_date', 'status'),
    )
    fields = {'project': 'task__project_id', 'source_task': 'task_id',
              'target_task': 'depends_on_id', 'assigned_to': 'assigned_to_id'}
    for param, field in fields.items():
        if param in values:
            queryset = queryset.filter(**{field: values[param]})
    if 'status' in values:
        queryset = queryset.filter(status=values['status'])
    if 'due_date_from' in values:
        queryset = queryset.filter(due_date__gte=values['due_date_from'])
    if 'due_date_to' in values:
        queryset = queryset.filter(due_date__lte=values['due_date_to'])
    if values['search']:
        queryset = queryset.filter(Q(description__icontains=values['search']) |
                                   Q(task__Task_Name__icontains=values['search']))
    return queryset.order_by(values.get('ordering', 'created_at'), 'pk')
