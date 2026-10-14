"""
Admin Panel Views
~~~~~~~~~~~~~~~~~

Three read-only endpoints protected by IsAdminUser:

  GET /api/admin/logs/api/      — paginated API request logs (filterable by method/status/path)
  GET /api/admin/logs/audit/    — paginated audit trail entries (filterable by action/entity)
  GET /api/admin/db/tables/     — list of all DB table names and row counts
  GET /api/admin/db/tables/<table>/  — first 100 rows of a table
"""

from django.db import connection
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import ApiRequestLog, AuditLog
from apps.core.pagination import ResourcePagination
from apps.admin_panel.permissions import IsAdminUser
from apps.admin_panel.serializers import ApiLogSerializer, AuditLogSerializer


class ApiLogsView(APIView):
    """
    List paginated API request logs.

    Supports optional filtering via query params:
        ?method=GET|POST|...
        ?status=200|404|500|...
        ?path=<substring>
        ?user=<username substring>
    """

    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        qs = ApiRequestLog.objects.select_related('user').order_by('-created_at')

        method = request.query_params.get('method')
        if method:
            qs = qs.filter(method=method.upper())

        status_code = request.query_params.get('status')
        if status_code and status_code.isdigit():
            qs = qs.filter(status_code=int(status_code))

        path = request.query_params.get('path')
        if path:
            qs = qs.filter(path__icontains=path)

        paginator = ResourcePagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        return paginator.get_paginated_response(ApiLogSerializer(page, many=True).data)


class AuditLogsView(APIView):
    """
    List paginated audit log entries.

    Supports optional filtering via query params:
        ?action=login|created|updated|deleted|...
        ?entity_type=project|task|user|...
        ?user=<username substring>
    """

    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        qs = AuditLog.objects.select_related('user').order_by('-timestamp')

        action = request.query_params.get('action')
        if action:
            qs = qs.filter(action=action)

        entity_type = request.query_params.get('entity_type')
        if entity_type:
            qs = qs.filter(entity_type=entity_type)

        user_query = request.query_params.get('user')
        if user_query:
            qs = qs.filter(user__user_name__icontains=user_query)

        paginator = ResourcePagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        return paginator.get_paginated_response(AuditLogSerializer(page, many=True).data)


class DbTablesView(APIView):
    """
    Return a list of all application database table names with their approximate row count.
    SQLite-compatible implementation.
    """

    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        with connection.cursor() as cursor:
            tables = connection.introspection.table_names(cursor)
            result = []
            for table in sorted(tables):
                try:
                    cursor.execute(f'SELECT COUNT(*) FROM "{table}"')  # noqa: S608
                    count = cursor.fetchone()[0]
                except Exception:
                    count = None
                result.append({'table': table, 'row_count': count})
        return Response({'tables': result})


class DbTableDetailView(APIView):
    """
    Return the column schema and first 100 rows of the requested table.
    Intentionally limited to read-only SELECT for safety.
    """

    permission_classes = [IsAuthenticated, IsAdminUser]
    _MAX_ROWS = 100

    def get(self, request, table_name):
        allowed_tables = set(connection.introspection.table_names())
        if table_name not in allowed_tables:
            return Response({'detail': 'Table not found.'}, status=404)

        with connection.cursor() as cursor:
            # Fetch column metadata
            desc = connection.introspection.get_table_description(cursor, table_name)
            columns = [col.name for col in desc]

            # Fetch first N rows
            cursor.execute(
                f'SELECT * FROM "{table_name}" LIMIT {self._MAX_ROWS}'  # noqa: S608
            )
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

        return Response({
            'table': table_name,
            'columns': columns,
            'rows': rows,
            'row_count': len(rows),
            'capped': len(rows) == self._MAX_ROWS,
        })
