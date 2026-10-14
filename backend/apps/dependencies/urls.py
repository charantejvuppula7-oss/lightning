from django.urls import path

from apps.dependencies.views import DependencyListCreateView, DependencyDetailView


urlpatterns = [
    path('dependencies/', DependencyListCreateView.as_view(), name='dependencies-list'),
    path('dependencies/<uuid:dependency_id>/', DependencyDetailView.as_view(), name='dependencies-detail'),
]
