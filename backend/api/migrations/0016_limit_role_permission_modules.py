"""Remove unsupported permission entries without deleting roles or assignments."""
from django.db import migrations


MODULES = ('Tasks', 'Features', 'Milestones', 'Reports', 'Projects', 'Documents',
           'Dependencies', 'User Management', 'Roles & permissions', 'Department Managment')
WIDGETS = ('TeamWorLoad', 'ProjectJourney', 'ProjectPerformanceGraph', 'MilestoneMap',
           'TeamStatus', 'recentActvities')


def clean_permissions(apps, schema_editor):
    Role = apps.get_model('api', 'Role')
    for role in Role.objects.using(schema_editor.connection.alias).all().iterator():
        permissions = role.permissions if isinstance(role.permissions, dict) else {}
        cleaned = {}
        for module in MODULES + WIDGETS:
            actions = ('View',) if module in WIDGETS else ('View', 'Create', 'Edit', 'Delete')
            values = permissions.get(module, {})
            cleaned[module] = {action: isinstance(values, dict) and values.get(action) is True for action in actions}
        if permissions != cleaned:
            role.permissions = cleaned
            role.save(using=schema_editor.connection.alias, update_fields=['permissions'])


class Migration(migrations.Migration):
    dependencies = [('api', '0015_alter_projectchatmessage_content')]
    operations = [migrations.RunPython(clean_permissions, migrations.RunPython.noop)]
