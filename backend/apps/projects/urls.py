from django.urls import path
from apps.projects.overview import ProjectOverviewView, DashboardOverviewView
from apps.projects.workspace import WorkspaceView

from apps.projects.views import (AssignedProjectListView, ProjectListCreateView, ProjectDetailView,
                                 ProjectSetupOptionsView, ProjectSetupDetailView, ProjectFilesView)


urlpatterns = [
    path('workspace/', WorkspaceView.as_view()),
    path('projects/overview/', ProjectOverviewView.as_view()),
    path('overview/', DashboardOverviewView.as_view()),
    path('projects/', ProjectListCreateView.as_view(), name='projects-list'),
    path('projects/assigned/', AssignedProjectListView.as_view(), name='projects-assigned'),
    path('projects/setup-options/', ProjectSetupOptionsView.as_view(), name='projects-setup-options'),
    path('projects/<uuid:project_id>/setup/', ProjectSetupDetailView.as_view(), name='projects-setup-detail'),
    path('projects/<uuid:project_id>/files/', ProjectFilesView.as_view(), name='projects-files'),
    path('projects/<uuid:project_id>/', ProjectDetailView.as_view(), name='projects-detail'),
]

