from django.urls import path

from apps.notifications.views import (NotificationListView, NotificationMarkAllReadView,
                                      NotificationReadView, NotificationStreamView,
                                      UnreadCountView, NotificationPreferencesView, NotificationTargetView)


urlpatterns = [
    path('notifications/preferences/', NotificationPreferencesView.as_view()),
    path('notifications/<uuid:notification_id>/target/', NotificationTargetView.as_view()),
    path('notifications/', NotificationListView.as_view(), name='notification-list'),
    path('notifications/stream/', NotificationStreamView.as_view(), name='notification-stream'),
    path('notifications/unread-count/', UnreadCountView.as_view(), name='notification-unread-count'),
    path('notifications/mark-all-read/', NotificationMarkAllReadView.as_view(), name='notification-mark-all-read'),
    path('notifications/<uuid:notification_id>/read/', NotificationReadView.as_view(),
         name='notification-read'),
]
