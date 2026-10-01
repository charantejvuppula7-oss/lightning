from django.db.models import Q

from apps.core.filtering import parse_filters


def filter_projects(queryset, params):
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
