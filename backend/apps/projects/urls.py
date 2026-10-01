from django.urls import path

from apps.projects.views import ProjectListCreateView, ProjectDetailView


urlpatterns = [
    path('projects/', ProjectListCreateView.as_view(), name='projects-list'),
    path('projects/<uuid:project_id>/', ProjectDetailView.as_view(), name='projects-detail'),
]

