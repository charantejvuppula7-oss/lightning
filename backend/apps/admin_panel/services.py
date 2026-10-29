"""Shared query and record operations for the Company monitoring screens."""
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from uuid import UUID
from functools import lru_cache
from copy import copy

from django.core.exceptions import ValidationError as ModelValidationError
from django.db import transaction, connection
from django.db.models import Q, ProtectedError
from django.utils.dateparse import parse_date
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from apps.audit.services import LogService
from .registry import DB_TABLE_REGISTRY, TABLE_RESOURCES
from apps.roles.permissions import (allowed_projects, has_permission, is_admin, require_permission,
    require_object_access, require_project_scope, require_user_relationships, scope_queryset)

HIDDEN_FIELDS = {'password', 'session_key'}


def paginate(queryset, params, default=50, maximum=200, total=None):
    def number(key, fallback):
        try:
            return max(1, int(params.get(key, fallback)))
        except (TypeError, ValueError):
            return fallback
    size = min(maximum, number('page_size', default))
    if total is None:
        total = queryset.count()
    pages = max(1, (total + size - 1) // size)
    page = min(pages, number('page', 1))
    return queryset[(page - 1) * size:page * size], {
        'page': page, 'page_size': size, 'total_count': total, 'total_pages': pages,
    }


def filter_dates(queryset, params, field):
    for name, lookup in [('date_from', 'gte'), ('date_to', 'lte')]:
        value = params.get(name)
        if value:
            try:
                parsed = parse_date(value)
            except ValueError:
                parsed = None
            if parsed is None:
                raise ValidationError({name: 'Use YYYY-MM-DD.'})
            if lookup == 'lte':
                if parsed == date.max:
                    continue
                parsed += timedelta(days=1)
            boundary = timezone.make_aware(datetime.combine(parsed, time.min))
            queryset = queryset.filter(**{f'{field}__{"gte" if lookup == "gte" else "lt"}': boundary})
    return queryset


def table_info(key):
    if key not in DB_TABLE_REGISTRY:
        raise NotFound('Table not found.')
    return DB_TABLE_REGISTRY[key]


def fields_for(model):
    missing = missing_fields(model)
    return [field for field in model._meta.fields if field.name not in HIDDEN_FIELDS | missing]


def missing_fields(model):
    """The shared Company schema may precede this checkout's additive migrations."""
    return _missing_fields(model, connection.settings_dict['NAME'])


@lru_cache(maxsize=128)
def _missing_fields(model, database_name):
    with connection.cursor() as cursor:
        names = {column.name for column in connection.introspection.get_table_description(cursor, model._meta.db_table)}
    return {field.name for field in model._meta.fields if field.column not in names}


def compatible_queryset(model):
    queryset = model.objects.defer(*missing_fields(model))
    relations = [f.name for f in model._meta.fields if f.is_relation]
    if relations:
        queryset = queryset.select_related(*relations)
        deferred = [f'{name}__{field}' for name in relations
                    for field in missing_fields(model._meta.get_field(name).related_model)]
        if deferred:
            queryset = queryset.defer(*deferred)
    return queryset


def columns_for(model):
    return [dict(name=f.name, verbose_name=str(f.verbose_name), type=f.get_internal_type(),
                 primary_key=f.primary_key, is_relation=f.is_relation, nullable=f.null)
            for f in fields_for(model)]


def json_value(value):
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, (UUID, Decimal)):
        return str(value)
    if value is None or isinstance(value, (str, int, float, bool, dict, list)):
        return value
    return str(value)


def record_data(obj, deep=False):
    data = {}
    for field in fields_for(type(obj)):
        value = getattr(obj, field.name)
        if field.is_relation and value is not None:
            data[field.name] = {'id': str(value.pk), 'display': str(value)} if deep else str(value)
            if not deep:
                data[field.name + '_id'] = str(value.pk)
        else:
            data[field.name] = json_value(value)
    if deep:
        data['_many_to_many'] = {f.name: [str(item) for item in compatible_queryset(f.related_model).filter(
            pk__in=getattr(obj, f.name).values('pk'))[:20]]
                                 for f in obj._meta.many_to_many}
    return data


def table_queryset(key, user):
    model = table_info(key)['model']
    resource = TABLE_RESOURCES.get(key, 'Database Explorer')
    require_permission(user, resource, 'View')
    queryset = compatible_queryset(model)
    if is_admin(user):
        return queryset
    if key == 'user_skills':
        from api.models import UserData
        return queryset.filter(person__in=scope_queryset(user, 'user', UserData.objects.all()))
    if key == 'chat_messages':
        return queryset.filter(room__project__in=allowed_projects(user))
    if resource in ('role', 'department', 'Database Explorer'):
        return queryset
    return scope_queryset(user, resource, queryset)


def table_records(key, params, user):
    info = table_info(key)
    model = info['model']
    queryset = table_queryset(key, user)
    valid = {f.name for f in fields_for(model)}
    search = params.get('search', '').strip()
    if search:
        query = Q()
        for name in info['search_fields']:
            if name.split('__')[0] in valid:
                field = model._meta.get_field(name.split('__')[0])
                if '__' in name or field.get_internal_type() in ('CharField', 'TextField', 'EmailField', 'GenericIPAddressField'):
                    query |= Q(**{name + '__icontains': search})
        if query:
            queryset = queryset.filter(query)
    sort = params.get('sort_field')
    if sort and sort not in valid:
        raise ValidationError({'sort_field': 'Unknown column.'})
    sort = sort or ('created_at' if 'created_at' in valid else model._meta.pk.name)
    direction = '-' if params.get('sort_dir', 'asc') == 'desc' else ''
    queryset = queryset.order_by(direction + sort, model._meta.pk.name)
    records, pagination = paginate(queryset, params, default=25, maximum=100)
    resource = TABLE_RESOURCES.get(key, 'Database Explorer')
    return dict(table_key=key, display_name=info['display_name'], columns=columns_for(model),
                can_edit=has_permission(user, resource, 'Edit'), can_delete=has_permission(user, resource, 'Delete'),
                rows=[record_data(obj) for obj in records], pagination=pagination)


def get_record(key, record_id, user):
    model = table_info(key)['model']
    try:
        return table_queryset(key, user).get(pk=record_id)
    except (model.DoesNotExist, ModelValidationError, ValueError):
        raise NotFound('Record not found.')


@transaction.atomic
def change_record(request, key, record_id, deleting=False):
    resource = TABLE_RESOURCES.get(key, 'Database Explorer')
    action = 'delete' if deleting else 'update'
    require_permission(request.user, resource, action)
    obj = get_record(key, record_id, request.user)
    if key != 'user_skills':
        require_object_access(request.user, resource, action, obj, request.data)
    original = copy(obj)
    if key == 'users' and obj.pk == request.user.pk and deleting:
        raise ValidationError('Cannot delete your own active administrator account.')
    before = record_data(obj)
    try:
        if deleting:
            LogService.log_audit_event(actor=request.user, action='deleted', entity_type=key,
                                       entity=obj, request=request, old_values=before)
            obj.delete()
        elif key == 'roles':
            from apps.roles.serializers import RoleSerializer
            serializer = RoleSerializer(obj, data=request.data, partial=True, context={'request': request})
            serializer.is_valid(raise_exception=True)
            obj = serializer.save()
            LogService.log_audit_event(actor=request.user, action='updated', entity_type=key,
                                       entity=obj, request=request, old_values=before, new_values=record_data(obj))
        elif key == 'tasks':
            from apps.tasks.serializers import TaskSerializer
            serializer = TaskSerializer(obj, data=request.data, partial=True, context={'request': request})
            serializer.is_valid(raise_exception=True)
            obj = serializer.save()
            LogService.log_audit_event(actor=request.user, action='updated', entity_type=key,
                                      entity=obj, request=request, old_values=before, new_values=record_data(obj))
        else:
            missing = missing_fields(type(obj))
            allowed = {f.name: f for f in obj._meta.fields if not f.primary_key and not f.auto_created
                       and f.name not in {'created_at', 'updated_at', 'session_key'} | missing}
            changed = []
            for name, value in request.data.items():
                if name == '_many_to_many':
                    continue
                if key == 'users' and name in ('role', 'department'):
                    if name == 'role':
                        from apps.roles.permissions import resolve_role_object
                        role = resolve_role_object(value)
                        if role is None:
                            raise ValidationError({'role': 'Unknown role.'})
                        obj.role_link = role
                        changed.append('role_link')
                    else:
                        from api.models import Department
                        normalized = Department.normalize_name(value) if value else None
                        if normalized and normalized not in Department.ALLOWED_DEPARTMENTS:
                            raise ValidationError({'department': 'Unknown department.'})
                        obj.department_link = Department.objects.get_or_create(name=normalized)[0] if normalized else None
                        changed.append('department_link')
                    continue
                if name not in allowed:
                    raise ValidationError({name: 'Field cannot be edited.'})
                if not is_admin(request.user) and name in ('created_by', 'updated_by', 'uploaded_by', 'sender', 'room'):
                    raise PermissionDenied('Record ownership cannot be changed here.')
                field = allowed[name]
                if name == 'password':
                    if value:
                        obj.set_password(value)
                elif field.is_relation:
                    setattr(obj, field.attname, value.get('id') if isinstance(value, dict) else value or None)
                else:
                    setattr(obj, name, field.to_python(None if value == '' and field.null else value))
                changed.append(name)
            if key == 'users':
                require_user_relationships(request.user, {name: getattr(obj, name) for name in changed}, original)
            if key == 'dependencies':
                from apps.dependencies.serializers import can_manage_dependency
                if not can_manage_dependency(request.user, obj.task):
                    raise PermissionDenied('Only the task owner or project manager can edit dependency assignments.')
            if key == 'user_skills':
                from api.models import UserData
                if not scope_queryset(request.user, 'user', UserData.objects.all()).filter(pk=obj.person_id).exists():
                    raise PermissionDenied('User outside your scope.')
            if not is_admin(request.user) and resource in ('task', 'sprint', 'milestone', 'document'):
                require_project_scope(request.user, obj.project)
            elif not is_admin(request.user) and resource == 'feature':
                require_project_scope(request.user, obj.Milestone.project)
            elif not is_admin(request.user) and resource == 'dependency':
                require_project_scope(request.user, obj.task.project)
            obj.full_clean(exclude=missing)
            if hasattr(obj, 'updated_at'):
                changed.append('updated_at')
            obj.save(update_fields=changed)
            LogService.log_audit_event(actor=request.user, action='updated', entity_type=key,
                                       entity=obj, request=request, old_values=before, new_values=record_data(obj))
    except (ModelValidationError, ProtectedError, ValueError, TypeError) as error:
        raise ValidationError(str(error))
    return {'message': 'Record deleted successfully.' if deleting else 'Record updated successfully.'}
