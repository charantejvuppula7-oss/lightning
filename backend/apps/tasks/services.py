from api.models import Task
from apps.notifications.services import schedule_assignment_notices


def create_tasks(project, user, task_specs, sprints, users):
    task_refs = {}
    tasks = []
    for data, feature in task_specs:
        ref = data.pop('temp_id', None)
        sprint_ref = data.pop('sprint_ref', None)
        assignee = users[data.pop('assigned_to')]
        reviewer_id = data.pop('review_by', None)
        task = Task(
            project=project, feature=feature,
            sprint=sprints.get(sprint_ref), assigned_to=assignee,
            review_by=users.get(reviewer_id),
            **data,
        )
        tasks.append(task)
        if ref:
            task_refs[ref] = task
    Task.objects.bulk_create(tasks, batch_size=200)
    schedule_assignment_notices(tasks, user)
    return task_refs
