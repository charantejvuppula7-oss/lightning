from django.urls import path

from apps.milestones.views import MilestoneListCreateView, MilestoneDetailView


urlpatterns = [
    path('milestones/', MilestoneListCreateView.as_view(), name='milestones-list'),
    path('milestones/<uuid:milestone_id>/', MilestoneDetailView.as_view(), name='milestones-detail'),
]

