from django.urls import path
from apps.dependencies.actions import DependencyStatusView, DependencyNudgeView

from apps.dependencies.views import DependencyListCreateView, DependencyDetailView


urlpatterns = [
    path('dependencies/<uuid:dependency_id>/status/', DependencyStatusView.as_view()),
    path('dependencies/<uuid:dependency_id>/nudge/', DependencyNudgeView.as_view()),
    path('dependencies/', DependencyListCreateView.as_view(), name='dependencies-list'),
    path('dependencies/<uuid:dependency_id>/', DependencyDetailView.as_view(), name='dependencies-detail'),
]
