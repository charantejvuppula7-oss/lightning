"""Email delivery and in-app deadline notification services."""

from django.conf import settings
from django.utils import timezone

from api.models import Task, TaskDependency
from apps.notifications.models import EmailOutbox, Notification
from apps.notifications.email_outbox import enqueue_emails


def schedule_account_notice(user, actor):
    email_data = {
        'to_email': user.email,
        'user_display_name': f'{user.first_name} {user.last_name}'.strip() or user.user_name,
        'username': user.user_name,
        'creator_name': f'{actor.first_name} {actor.last_name}'.strip() or actor.user_name,
        'reset_password_url': f"{settings.FRONTEND_URL.rstrip('/')}/forgot-password",
    }
    enqueue_emails([(EmailOutbox.ACCOUNT_CREATED, email_data)])


def schedule_assignment_notice(task, actor):
    schedule_assignment_notices([task], actor)


def schedule_assignment_notices(tasks, actor):
    messages = []
    in_app = []
    assigned_by_name = f'{actor.first_name} {actor.last_name}'.strip() or actor.user_name
    for task in tasks:
        assignee = task.assigned_to
        if not assignee:
            continue
        in_app.append(Notification(
            user_id=assignee.pk, notification_type=Notification.TASK_ASSIGNED,
            resource_id=task.pk, notification_date=timezone.localdate(),
            title='Task assigned',
            message=f'{assigned_by_name} assigned **{task.Task_Name or "a task"}** to you.'[:300],
        ))
        if not assignee.email:
            continue
        email_data = {
            'to_email': assignee.email,
            'user_display_name': f'{assignee.first_name} {assignee.last_name}'.strip() or assignee.user_name,
            'task_name': task.Task_Name or str(task.pk)[:8],
            'project_name': task.project.project_name,
            'due_date': task.Due_Date.isoformat() if task.Due_Date else None,
            'assigned_by_name': assigned_by_name,
        }
        messages.append((EmailOutbox.TASK_ASSIGNED, email_data))
    Notification.objects.bulk_create(in_app, ignore_conflicts=True, batch_size=500)
    enqueue_emails(messages)


def generate_due_notifications(today=None):
    """Persist one alert per recipient, resource, type, and local day."""
    today = today or timezone.localdate()
    pending = []
    created_count = 0

    def flush():
        nonlocal created_count
        if not pending:
            return
        user_ids = {item.user_id for item in pending}
        resource_ids = {item.resource_id for item in pending}
        kinds = {item.notification_type for item in pending}
        existing = set(Notification.objects.filter(
            notification_date=today, user_id__in=user_ids,
            resource_id__in=resource_ids, notification_type__in=kinds,
        ).values_list('user_id', 'notification_type', 'resource_id'))
        fresh = [item for item in pending if (
            item.user_id, item.notification_type, item.resource_id) not in existing]
        Notification.objects.bulk_create(fresh, batch_size=500, ignore_conflicts=True)
        created_count += Notification.objects.filter(pk__in=[item.pk for item in fresh]).count()
        pending.clear()

    def queue(notification):
        pending.append(notification)
        if len(pending) == 500:
            flush()

    task_fields = ('id', 'Task_Name', 'assigned_to_id', 'Due_Date')
    for due_today, kind, title in (
        (True, Notification.TASK_DUE_TODAY, 'Task Due Today'),
        (False, Notification.TASK_OVERDUE, 'Task Overdue'),
    ):
        date_filter = {'Due_Date': today} if due_today else {'Due_Date__lt': today}
        tasks = (Task.objects.filter(**date_filter).exclude(status='completed')
                 .values(*task_fields).iterator(chunk_size=500))
        for task in tasks:
            queue(Notification(
                user_id=task['assigned_to_id'], notification_type=kind,
                resource_id=task['id'], notification_date=today, title=title,
                message=f'"{task["Task_Name"]}" is {"due today" if due_today else "overdue"}.',
            ))

    dependency_fields = ('id', 'description', 'assigned_to_id', 'task__assigned_to_id', 'due_date')
    for due_today, kind, title in (
        (True, Notification.DEPENDENCY_DUE_TODAY, 'Dependency Due Today'),
        (False, Notification.DEPENDENCY_OVERDUE, 'Dependency Overdue'),
    ):
        date_filter = {'due_date': today} if due_today else {'due_date__lt': today}
        dependencies = (TaskDependency.objects.filter(**date_filter).exclude(status='completed')
                        .values(*dependency_fields).iterator(chunk_size=500))
        for dependency in dependencies:
            recipient_id = dependency['assigned_to_id'] or dependency['task__assigned_to_id']
            if recipient_id:
                queue(Notification(
                    user_id=recipient_id, notification_type=kind,
                    resource_id=dependency['id'], notification_date=today, title=title,
                    message=f'"{dependency["description"][:180]}" is '
                            f'{"due today" if due_today else "overdue"}.',
                ))

    flush()
    return created_count
