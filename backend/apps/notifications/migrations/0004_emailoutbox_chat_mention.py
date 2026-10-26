from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('pms_notifications', '0003_alter_notification_notification_type')]
    operations = [migrations.AlterField(
        model_name='emailoutbox', name='kind',
        field=models.CharField(max_length=30, choices=[('account_created', 'Account created'),
            ('task_assigned', 'Task assigned'), ('chat_mention', 'Chat mention')]),
    )]
