"""
Root URL Configuration
~~~~~~~~~~~~~~~~~~~~~~

This is the top-level URL dispatcher for the PMS backend.
All functional business domains are exposed under the `/api/` prefix.

When adding a new domain/feature:
1. Create your `urls.py` within `apps/<feature_name>/urls.py`.
2. Register the endpoint list below with `path('api/', include('apps.<feature_name>.urls'))`.
3. Standard conventions dictate RESTful resource routing (e.g. `/api/<resource>/`).
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
    path('api/', include('apps.admin_panel.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
