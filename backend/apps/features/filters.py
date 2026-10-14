from django.db.models import Q

from api.models import Milestone_Features
from apps.core.filtering import parse_filters


def filter_features(queryset, params):
    """
    Apply validated filters and ordering to a Milestone_Features queryset.

    Supported filters:
      - 'project': Project UUID.
      - 'milestone': Milestone UUID.
      - 'status': Feature status choice.
      - 'priority': Feature priority choice.
      - 'due_date_from', 'due_date_to': Due date range.
      - 'search': Case-insensitive search on feature name and description.
      - 'ordering': Sort fields ('feature_name', 'feature_due_date', 'created_at', 'updated_at', 'feature_status', 'feature_priority').

    Args:
        queryset (QuerySet[Milestone_Features]): Base feature queryset.
        params (QueryDict|dict): Incoming HTTP query parameters.

    Returns:
        QuerySet[Milestone_Features]: Filtered and ordered feature queryset.
    """
    values = parse_filters(
        params, ids=('project', 'milestone'),
        dates=('due_date_from', 'due_date_to'),
        choices={'status': Milestone_Features.Status.values,
                 'priority': Milestone_Features.Priority.values},
        ordering=('feature_name', 'feature_due_date', 'created_at', 'updated_at',
                  'feature_status', 'feature_priority'),
    )
    if 'project' in values:
        queryset = queryset.filter(Milestone__project_id=values['project'])
    if 'milestone' in values:
        queryset = queryset.filter(Milestone_id=values['milestone'])
    if 'status' in values:
        queryset = queryset.filter(feature_status=values['status'])
    if 'priority' in values:
        queryset = queryset.filter(feature_priority=values['priority'])
    if 'due_date_from' in values:
        queryset = queryset.filter(feature_due_date__date__gte=values['due_date_from'])
    if 'due_date_to' in values:
        queryset = queryset.filter(feature_due_date__date__lte=values['due_date_to'])
    if values['search']:
        queryset = queryset.filter(Q(feature_name__icontains=values['search']) |
                                   Q(description__icontains=values['search']))
    return queryset.order_by(values.get('ordering', 'pk'), 'pk')

