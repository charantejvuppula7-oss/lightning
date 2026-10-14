from django.db.models import Q

from apps.core.filtering import parse_filters


def filter_projects(queryset, params):
    """
    Filter, search, and sort a Project queryset according to query parameters.

    Supported filters:
      - 'priority': Priority lookup UUID.
      - 'department': Department UUID membership.
      - 'manager': Project manager UserData UUID.
      - 'member': Team member UserData UUID.
      - 'created_by': Project creator UserData UUID.
      - Date ranges: 'start_date_from', 'start_date_to', 'end_date_from', 'end_date_to'.
      - 'search': Case-insensitive search across project_name, project_code, and description.
      - 'ordering': Permitted sort keys ('project_name', 'project_code', 'start_date', 'end_date', 'created_at', 'updated_at').

    Args:
        queryset (QuerySet[Project]): Initial project queryset.
        params (QueryDict|dict): Incoming GET query parameters.

    Returns:
        QuerySet[Project]: Filtered, distinct, and sorted project queryset.
    """
    values = parse_filters(
        params, ids=('priority', 'department', 'manager', 'member', 'created_by'),
        dates=('start_date_from', 'start_date_to', 'end_date_from', 'end_date_to'),
        ordering=('project_name', 'project_code', 'start_date', 'end_date', 'created_at', 'updated_at'),
    )
    fields = {'priority': 'priority_link_id', 'department': 'departments__id',
              'manager': 'project_managers__id', 'member': 'team_members__id',
              'created_by': 'created_by_id'}
    for param, field in fields.items():
        if param in values:
            queryset = queryset.filter(**{field: values[param]})
    for param, field in (('start_date_from', 'start_date__gte'), ('start_date_to', 'start_date__lte'),
                         ('end_date_from', 'end_date__gte'), ('end_date_to', 'end_date__lte')):
        if param in values:
            queryset = queryset.filter(**{field: values[param]})
    if values['search']:
        queryset = queryset.filter(Q(project_name__icontains=values['search']) |
                                   Q(project_code__icontains=values['search']) |
                                   Q(description__icontains=values['search']))
    return queryset.distinct().order_by(values.get('ordering', 'pk'), 'pk')

