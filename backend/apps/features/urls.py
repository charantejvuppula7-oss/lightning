from django.urls import path

from apps.features.views import FeatureListCreateView, FeatureDetailView


urlpatterns = [
    path('features/', FeatureListCreateView.as_view(), name='features-list'),
    path('features/<uuid:feature_id>/', FeatureDetailView.as_view(), name='features-detail'),
]

