from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    name = 'apps.notifications'
    label = 'pms_notifications'

    def ready(self):
        from . import signals  # noqa: F401
