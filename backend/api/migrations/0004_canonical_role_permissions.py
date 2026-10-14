"""Convert supported legacy permission keys without changing role assignments."""

from django.db import migrations


MODULES = {
    'task': 'Tasks', 'feature': 'Features', 'milestone': 'Milestones',
    'project': 'Projects', 'user': 'User Management',
}
ACTIONS = {'read': 'View', 'create': 'Create', 'update': 'Edit', 'delete': 'Delete'}
KNOWN = {
    'tasks': 'Tasks', 'features': 'Features', 'milestones': 'Milestones',
    'reports': 'Reports', 'projects': 'Projects', 'documents': 'Documents',
    'dependencies': 'Dependencies', 'user management': 'User Management',
    'roles & permissions': 'Roles & permissions', 'department managment': 'Department Managment',
    'teamworload': 'TeamWorLoad', 'projectjourney': 'ProjectJourney',
    'projectperformancegraph': 'ProjectPerformanceGraph', 'milestonemap': 'MilestoneMap',
    'teamstatus': 'TeamStatus', 'recentactvities': 'recentActvities',
}
WIDGETS = {'TeamWorLoad', 'ProjectJourney', 'ProjectPerformanceGraph',
           'MilestoneMap', 'TeamStatus', 'recentActvities'}


def canonicalize(permissions):
    converted = {}
    if not isinstance(permissions, dict):
        return converted
    for key, values in permissions.items():
        if not isinstance(values, dict):
            continue
        module = KNOWN.get(str(key).strip().lower())
        if not module:
            continue
        for action, enabled in values.items():
            label = next((name for name in ACTIONS.values() if name.lower() == str(action).lower()), None)
            if label and isinstance(enabled, bool) and (module not in WIDGETS or label == 'View'):
                converted.setdefault(module, {})[label] = enabled
    for key, enabled in permissions.items():
        if not isinstance(enabled, bool) or '.' not in key:
            continue
        resource, action = key.rsplit('.', 1)
        module, label = MODULES.get(resource), ACTIONS.get(action)
        if module and label:
            previous = converted.setdefault(module, {}).get(label)
            converted[module][label] = enabled if previous is None else previous and enabled
    return converted


def migrate_permissions(apps, schema_editor):
    Role = apps.get_model('api', 'Role')
    db = schema_editor.connection.alias
    for role in Role.objects.using(db).all().iterator():
        original = role.permissions
        converted = canonicalize(original)
        if not original and role.name.strip().lower() in ('pm', 'project manager', 'project_manager'):
            for module in MODULES.values():
                converted[module] = {action: True for action in ACTIONS.values()}
        elif not original and role.name.strip().lower() in ('developer', 'dev'):
            converted = {'Projects': {'View': True}, 'Tasks': {'View': True, 'Edit': True}}
        if converted != original:
            role.permissions = converted
            role.save(update_fields=['permissions'])


class Migration(migrations.Migration):
    dependencies = [('api', '0003_normalize_open_task_status')]

    operations = [migrations.RunPython(migrate_permissions, migrations.RunPython.noop)]
