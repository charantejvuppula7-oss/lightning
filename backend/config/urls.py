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
from apps.core.search import GlobalSearchView
from apps.core.version import AppVersionView
from apps.documents.views import ProtectedMediaView


urlpatterns = [
    path('media/<path:file_path>', ProtectedMediaView.as_view()),
    path('api/user/app-version/', AppVersionView.as_view()),
    path('api/search/', GlobalSearchView.as_view()),
    path('api/', include('apps.users.urls')),
    path('api/', include('apps.approvals.urls')),
    path('api/', include('apps.documents.urls')),
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
