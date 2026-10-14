from django.db.models import Q

from apps.core.filtering import parse_filters


def filter_milestones(queryset, params):
    """
    Apply validated filtering and sorting parameters to a Milestones queryset.

    Supported filters:
      - 'project': Project UUID.
      - 'created_by': UserData UUID.
      - 'task': Task UUID.
      - 'due_date_from', 'due_date_to': Date range.
      - 'search': Case-insensitive search on milestone name and description.
      - 'ordering': Sort fields ('name', 'due_date', 'created_at', 'updated_at').

    Args:
        queryset (QuerySet[Milestones]): Base milestone queryset.
        params (QueryDict|dict): Incoming GET parameters.

    Returns:
        QuerySet[Milestones]: Filtered and ordered milestone queryset.
    """
    values = parse_filters(
        params, ids=('project', 'created_by', 'task'),
        dates=('due_date_from', 'due_date_to'),
        ordering=('name', 'due_date', 'created_at', 'updated_at'),
    )
    for param in ('project', 'created_by', 'task'):
        if param in values:
            queryset = queryset.filter(**{f'{param}_id': values[param]})
    if 'due_date_from' in values:
        queryset = queryset.filter(due_date__gte=values['due_date_from'])
    if 'due_date_to' in values:
        queryset = queryset.filter(due_date__lte=values['due_date_to'])
    if values['search']:
        queryset = queryset.filter(Q(name__icontains=values['search']) |
                                   Q(description__icontains=values['search']))
    return queryset.order_by(values.get('ordering', 'pk'), 'pk')

