from django.db import migrations


def normalize_status(apps, schema_editor):
    Task = apps.get_model('api', 'Task')
    Task.objects.using(schema_editor.connection.alias).filter(status='started').update(status='open')


class Migration(migrations.Migration):
    dependencies = [('api', '0002_userdata_unique_user_email_ci_and_more')]

    operations = [migrations.RunPython(normalize_status, migrations.RunPython.noop)]
