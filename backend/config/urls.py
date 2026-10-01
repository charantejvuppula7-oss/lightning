"""
Root URL Configuration
~~~~~~~~~~~~~~~~~~~~~~

This is the top-level URL dispatcher for the PMS backend.
Admin interface and admin-related pages are completely removed.
"""

from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('api/', include('apps.users.urls')),
    path('api/', include('apps.roles.urls')),
    path('api/', include('apps.projects.urls')),
    path('api/', include('apps.features.urls')),
    path('api/', include('apps.tasks.urls')),
    path('api/', include('apps.sprints.urls')),
    path('api/', include('apps.dependencies.urls')),
    path('api/', include('apps.milestones.urls')),
    path('api/', include('apps.notifications.urls')),
    path('api/', include('apps.chat.urls')),
    path('api/', include('apps.calendar.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
