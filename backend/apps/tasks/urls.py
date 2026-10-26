from django.urls import path

from apps.tasks.views import TaskListCreateView, TaskDetailView
from apps.tasks.options import TaskOptionsView
from apps.tasks.status import TaskStatusView


urlpatterns = [
    path('tasks/', TaskListCreateView.as_view(), name='tasks-list'),
    path('tasks/options/', TaskOptionsView.as_view()),
    path('tasks/<uuid:task_id>/status/', TaskStatusView.as_view()),
    path('tasks/<uuid:task_id>/', TaskDetailView.as_view(), name='tasks-detail'),
]

