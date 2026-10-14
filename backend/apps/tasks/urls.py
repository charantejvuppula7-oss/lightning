from django.urls import path

from apps.tasks.views import TaskListCreateView, TaskDetailView


urlpatterns = [
    path('tasks/', TaskListCreateView.as_view(), name='tasks-list'),
    path('tasks/<uuid:task_id>/', TaskDetailView.as_view(), name='tasks-detail'),
]

