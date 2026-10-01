from django.urls import path

from apps.sprints.views import SprintListCreateView, SprintDetailView, SprintBulkCreateView


urlpatterns = [
    path('sprints/', SprintListCreateView.as_view(), name='sprints-list'),
    path('sprints/<uuid:sprint_id>/', SprintDetailView.as_view(), name='sprints-detail'),
    path('projects/<uuid:project_id>/sprints/bulk/', SprintBulkCreateView.as_view(),
         name='sprints-bulk-create'),
]
