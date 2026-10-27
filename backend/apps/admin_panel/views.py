"""Monitoring endpoints; database mutations remain administrator-only."""
from django.db.models import Avg, Count, Q
from django.db import connection
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from api.models import ApiRequestLog, AuditLog
from .permissions import IsAdminUser, CanReadAuditLogs
from .serializers import ApiLogSerializer, AuditLogSerializer
from .services import (paginate, filter_dates, columns_for, table_records, table_info,
                       get_record, record_data, change_record)
from .registry import DB_TABLE_REGISTRY

class AdminView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

class ApiLogsView(AdminView):
    def get(self, request):
        params = request.query_params
        qs = ApiRequestLog.objects.select_related('user').order_by('-created_at', '-id')
        if params.get('method'):
            qs = qs.filter(method=params['method'].upper())
        code = params.get('status_code') or params.get('status')
        if code in ('2xx', '3xx', '4xx', '5xx'):
            qs = qs.filter(status_code__gte=int(code[0])*100, status_code__lt=(int(code[0])+1)*100)
        elif code and code.isdigit():
            qs = qs.filter(status_code=int(code))
        for param, lookup in [('path', 'path__icontains'), ('user', 'user__user_name__icontains')]:
            if params.get(param): qs = qs.filter(**{lookup: params[param]})
        if params.get('search'):
            qs = qs.filter(Q(path__icontains=params['search']) | Q(user__user_name__icontains=params['search']))
        qs = filter_dates(qs, params, 'created_at')
        metrics = qs.aggregate(total_requests=Count('id'), avg_response_time=Avg('response_time_ms'),
            success_count=Count('id', filter=Q(status_code__gte=200, status_code__lt=300)),
            client_errors=Count('id', filter=Q(status_code__gte=400, status_code__lt=500)),
            server_errors=Count('id', filter=Q(status_code__gte=500)))
        metrics['success_rate'] = round(metrics.pop('success_count') * 100 / (metrics['total_requests'] or 1), 1)
        metrics['avg_response_time'] = round(metrics['avg_response_time'] or 0, 2)
        rows, pagination = paginate(qs, params, total=metrics['total_requests'])
        return Response(dict(metrics=metrics, pagination=pagination, results=ApiLogSerializer(rows, many=True).data))

class AuditLogsView(AdminView):
    permission_classes = [IsAuthenticated, CanReadAuditLogs]
    def get(self, request):
        params = request.query_params
        qs = AuditLog.objects.select_related('user').order_by('-timestamp', '-id')
        for field in ['action', 'entity_type']:
            if params.get(field): qs = qs.filter(**{field: params[field]})
        if params.get('user'): qs = qs.filter(user__user_name__icontains=params['user'])
        if params.get('search'):
            text = params['search']
            qs = qs.filter(Q(description__icontains=text) | Q(entity_name__icontains=text) | Q(user__user_name__icontains=text))
        qs = filter_dates(qs, params, 'timestamp')
        rows, pagination = paginate(qs, params)
        return Response(dict(pagination=pagination, results=AuditLogSerializer(rows, many=True).data))

class DbTablesView(AdminView):
    def get(self, request):
        # One statement keeps exact counts fresh without one round trip per table.
        counts_sql = ' UNION ALL '.join(
            f'SELECT %s AS table_key, COUNT(*) AS row_count FROM {connection.ops.quote_name(info["model"]._meta.db_table)}'
            for info in DB_TABLE_REGISTRY.values()
        )
        with connection.cursor() as cursor:
            cursor.execute(counts_sql, list(DB_TABLE_REGISTRY))
            counts = dict(cursor.fetchall())
        result = []
        for key, info in DB_TABLE_REGISTRY.items():
            model = info['model']
            columns = columns_for(model)
            names = {column['name'] for column in columns}
            result.append(dict(table_key=key, display_name=info['display_name'], category=info['category'],
                icon=info['icon'], row_count=counts[key], columns=columns,
                default_fields=[name for name in info['default_fields'] if name in names]))
        return Response(result)

class DbTableDetailView(AdminView):
    def get(self, request, table_name):
        return Response(table_records(table_name, request.query_params))

class DbRecordView(AdminView):
    def get(self, request, table_name, record_id):
        return Response(dict(table_key=table_name, record_id=record_id, data=record_data(get_record(table_name, record_id), deep=True)))
    def put(self, request, table_name, record_id):
        return Response(change_record(request, table_name, record_id))
    patch = put
    def delete(self, request, table_name, record_id):
        return Response(change_record(request, table_name, record_id, deleting=True))
