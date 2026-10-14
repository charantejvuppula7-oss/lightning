from django.urls import path

from apps.admin_panel.views import (
    ApiLogsView,
    AuditLogsView,
    DbTablesView,
    DbTableDetailView,
)

urlpatterns = [
    path('admin/logs/api/', ApiLogsView.as_view(), name='admin-api-logs'),
    path('admin/logs/audit/', AuditLogsView.as_view(), name='admin-audit-logs'),
    path('admin/db/tables/', DbTablesView.as_view(), name='admin-db-tables'),
    path('admin/db/tables/<str:table_name>/', DbTableDetailView.as_view(), name='admin-db-table-detail'),
]
