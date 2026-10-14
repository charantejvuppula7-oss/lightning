from django.db.models import Q

from api.models import Sprint
from apps.core.filtering import parse_filters


def filter_sprints(queryset, params):
    """
    Apply validated filtering and sorting parameters to a Sprint queryset.

    Supported filters:
      - 'project': Project UUID.
      - 'member': Team member UserData UUID.
      - 'status': Sprint status choice ('active', 'completed', 'yet_to_start', etc.).
      - 'exclude_weekends': Boolean flag ('true'/'false').
      - Date ranges: 'start_date_from', 'start_date_to', 'end_date_from', 'end_date_to'.
      - 'search': Case-insensitive search on Sprint_Name and Sprint_No.
      - 'ordering': Sort fields ('Sprint_Name', 'Sprint_No', 'Sprint_start_date', 'Sprint_end_date', 'Created_at', 'Updated_at', 'Status').

    Args:
        queryset (QuerySet[Sprint]): Base sprint queryset.
        params (QueryDict|dict): Incoming query parameters.

    Returns:
        QuerySet[Sprint]: Filtered and ordered sprint queryset.
    """
    values = parse_filters(
        params, ids=('project', 'member'),
        dates=('start_date_from', 'start_date_to', 'end_date_from', 'end_date_to'),
        choices={'status': dict(Sprint.STATUS_CHOICES)},
        booleans=('exclude_weekends',),
        ordering=('Sprint_Name', 'Sprint_No', 'Sprint_start_date', 'Sprint_end_date',
                  'Created_at', 'Updated_at', 'Status'),
    )
    if 'project' in values:
        queryset = queryset.filter(project_id=values['project'])
    if 'member' in values:
        queryset = queryset.filter(team_members__id=values['member'])
    if 'status' in values:
        queryset = queryset.filter(Status=values['status'])
    if 'exclude_weekends' in values:
        queryset = queryset.filter(exclude_weekends=values['exclude_weekends'])
    for param, field in (('start_date_from', 'Sprint_start_date__gte'),
                         ('start_date_to', 'Sprint_start_date__lte'),
                         ('end_date_from', 'Sprint_end_date__gte'),
                         ('end_date_to', 'Sprint_end_date__lte')):
        if param in values:
            queryset = queryset.filter(**{field: values[param]})
    if values['search']:
        queryset = queryset.filter(Q(Sprint_Name__icontains=values['search']) |
                                   Q(Sprint_No__icontains=values['search']))
    if 'member' in values:
        queryset = queryset.distinct()
    return queryset.order_by(values.get('ordering', 'Sprint_start_date'), 'pk')

