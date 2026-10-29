"""Deliver notification invalidations only after the database commits."""
from django.db import transaction
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from api.models import Task
from apps.notifications.models import Notification


def notify_users(user_ids):
    from apps.chat.socket import publish_notifications
    recipients = {str(value) for value in user_ids if value}
    if recipients:
        transaction.on_commit(lambda: publish_notifications(recipients))


@receiver(post_save, sender=Notification)
def notification_saved(sender, instance, **kwargs):
    notify_users({instance.user_id})


@receiver(pre_save, sender=Task)
def remember_status(sender, instance, **kwargs):
    instance._previous_status = None if instance._state.adding else sender.objects.filter(pk=instance.pk).values_list('status', flat=True).first()


@receiver(post_save, sender=Task)
def task_status_changed(sender, instance, created, **kwargs):
    previous = getattr(instance, '_previous_status', None)
    if created or not previous or previous == instance.status:
        return
    recipients = {instance.assigned_to_id}
    if instance.status == 'in_review':
        recipients = {instance.review_by_id}
    users = instance._meta.get_field('assigned_to').related_model.objects.filter(
        pk__in=recipients, account_status='active')
    if previous != 'in_review' and instance.status != 'in_review':
        users = users.filter(notify_task_status=True)
    Notification.objects.bulk_create([
        Notification(user=user, notification_type=Notification.TASK_STATUS_CHANGED,
                     resource_id=instance.pk, notification_date=timezone.localdate(),
                     title='Task status changed',
                     message=f'"{instance.Task_Name}" is now {instance.status.replace("_", " ")}.'[:300])
        for user in users
    ])
