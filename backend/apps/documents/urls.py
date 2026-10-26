from django.urls import path

from apps.documents.views import DocumentListView, DocumentDetailView, DocumentDownloadView, DocumentBulkDeleteView

urlpatterns = [
    path('documents/', DocumentListView.as_view()),
    path('documents/bulk-delete/', DocumentBulkDeleteView.as_view()),
    path('documents/<uuid:document_id>/', DocumentDetailView.as_view()),
    path('documents/<uuid:document_id>/download/', DocumentDownloadView.as_view()),
]
