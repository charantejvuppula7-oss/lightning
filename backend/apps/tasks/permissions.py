from apps.roles.permissions import has_permission, is_admin


def manages_tasks(user, project):
    return is_admin(user) or (has_permission(user, 'Tasks', 'Edit') and (
        project.created_by_id == user.pk or any(person.pk == user.pk for person in project.project_managers.all())))


def can_review_task(user, task):
    return has_permission(user, 'Tasks', 'View') and (
        task.review_by_id == user.pk or manages_tasks(user, task.project))
