from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('api', '0012_taskdependency_type')]
    operations = [migrations.AlterField(
        model_name='taskdependency', name='dependency_type',
        field=models.CharField(max_length=20, default='optional', db_default='optional',
            choices=[('mandatory', 'Mandatory dependency'), ('optional', 'Optional dependency')]),
    )]
