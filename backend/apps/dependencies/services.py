from api.models import TaskDependency


def create_dependencies(task_refs, dependencies_data, users):
    dependencies = []
    for data in dependencies_data:
        source = task_refs[data.pop('task_ref')]
        target_ref = data.pop('depends_on_ref', None)
        assignee_id = data.pop('assigned_to', None)
        dependency = TaskDependency(
            task=source,
            depends_on=task_refs[target_ref] if target_ref else None,
            assigned_to=users.get(assignee_id),
            **data,
        )
        dependencies.append(dependency)
    TaskDependency.objects.bulk_create(dependencies, batch_size=200)
