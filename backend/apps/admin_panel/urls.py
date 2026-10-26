from django.urls import path

from apps.admin_panel.views import (
    DbRecordView,
    ApiLogsView,
    AuditLogsView,
    DbTablesView,
    DbTableDetailView,
)

urlpatterns = [
    path('api-logs/', ApiLogsView.as_view()),
    path('audit-logs/', AuditLogsView.as_view()),
    path('admin/database/tables/', DbTablesView.as_view()),
    path('admin/database/table/<str:table_name>/', DbTableDetailView.as_view()),
    path('admin/database/table/<str:table_name>/<str:record_id>/', DbRecordView.as_view()),
    path('admin/logs/api/', ApiLogsView.as_view(), name='admin-api-logs'),
    path('admin/logs/audit/', AuditLogsView.as_view(), name='admin-audit-logs'),
    path('admin/db/tables/', DbTablesView.as_view(), name='admin-db-tables'),
    path('admin/db/tables/<str:table_name>/', DbTableDetailView.as_view(), name='admin-db-table-detail'),
]
