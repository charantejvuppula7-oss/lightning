from api.models import Sprint, SprintOffDay


def create_sprints(project, sprints_data):
    """
    Bulk-create sprints, compute net working days, and bind team members and off-days.

    Args:
        project (Project): Parent project instance.
        sprints_data (list[dict]): List of sprint dictionaries from project creation serializer.

    Returns:
        tuple[list[tuple[Sprint, str|None]], dict[str, Sprint]]:
            - List of (Sprint, client_id) pairs.
            - Mapping of client temporary IDs to the created Sprint instances.
    """
    prepared = []
    members = []
    off_days = []
    sprint_map = {}
    membership = Sprint.team_members.through
    for data in sprints_data:
        client_id = data.pop('client_id', None)
        sprint_members = data.pop('team_members', [])
        sprint_off_days = data.pop('off_days', [])
        sprint = Sprint(project=project, **data)
        sprint.Number_of_days = sprint.working_days(sprint_off_days)
        prepared.append((sprint, client_id))
        if client_id:
            sprint_map[client_id] = sprint
        members.extend(membership(sprint_id=sprint.pk, userdata_id=user_id)
                       for user_id in sprint_members)
        off_days.extend(SprintOffDay(sprint_id=sprint.pk, date=day) for day in sprint_off_days)
    Sprint.objects.bulk_create([sprint for sprint, _ in prepared], batch_size=200)
    if members:
        membership.objects.bulk_create(members, batch_size=500)
    if off_days:
        SprintOffDay.objects.bulk_create(off_days, batch_size=500)
    return prepared, sprint_map

