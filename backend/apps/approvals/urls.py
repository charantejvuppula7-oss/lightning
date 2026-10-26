from django.urls import path
from apps.approvals.views import ApprovalListView, DependencyDecisionView

urlpatterns = [
    path('approvals/', ApprovalListView.as_view()),
    path('approvals/dependencies/<uuid:dependency_id>/', DependencyDecisionView.as_view()),
]
