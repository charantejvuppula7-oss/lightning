from api.models import TaskDependency


def create_dependencies(task_refs, dependencies_data, users):
    """
    Bulk-instantiate and persist TaskDependency records resolving temporary task references.

    Args:
        task_refs (dict[str, Task]): Mapping from client temporary task IDs to created Task objects.
        dependencies_data (list[dict]): Dependency dictionaries containing 'task_ref' and 'depends_on_ref'.
        users (dict[UUID, UserData]): User lookup dictionary for resolving assignees.
    """
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

