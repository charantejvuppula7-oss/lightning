from rest_framework import serializers

from api.models import Sprint, UserData
from apps.roles.permissions import require_project_scope


class SprintSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sprint
        fields = ('id', 'project', 'Sprint_No', 'Sprint_Name',
                  'Sprint_start_date', 'Sprint_end_date', 'Number_of_days',
                  'exclude_weekends', 'Status', 'team_members',
                  'points_per_working_day', 'Created_at', 'Updated_at')
        read_only_fields = ('id', 'Number_of_days', 'Created_at', 'Updated_at')

    def validate(self, attrs):
        project = attrs.get('project', self.instance.project if self.instance else None)
        if project is None:
            return attrs
        require_project_scope(self.context['request'].user, project)
        if self.instance and project.pk != self.instance.project_id:
            raise serializers.ValidationError({'project': 'A sprint cannot move to another project.'})

        start = attrs.get('Sprint_start_date', self.instance.Sprint_start_date if self.instance else None)
        end = attrs.get('Sprint_end_date', self.instance.Sprint_end_date if self.instance else None)
        if start and end and end < start:
            raise serializers.ValidationError({'Sprint_end_date': 'Must be on or after Sprint_start_date.'})
        if project.start_date and start and start < project.start_date:
            raise serializers.ValidationError({'Sprint_start_date': 'Sprint starts before the project.'})
        if project.end_date and end and end > project.end_date:
            raise serializers.ValidationError({'Sprint_end_date': 'Sprint ends after the project.'})
        if 'team_members' in attrs:
            member_ids = {project.created_by_id}
            member_ids.update(project.team_members.values_list('pk', flat=True))
            member_ids.update(project.project_managers.values_list('pk', flat=True))
            if any(user.pk not in member_ids or user.account_status != 'active'
                   for user in attrs['team_members']):
                raise serializers.ValidationError({'team_members': 'Users must be active project members.'})
        return attrs


class SprintCreateItemSerializer(serializers.Serializer):
    client_id = serializers.CharField(max_length=100, required=False)
    Sprint_No = serializers.CharField(max_length=20, required=False, allow_blank=True)
    Sprint_Name = serializers.CharField(max_length=200)
    Sprint_start_date = serializers.DateField()
    Sprint_end_date = serializers.DateField()
    exclude_weekends = serializers.BooleanField(required=False)
    team_members = serializers.ListField(child=serializers.UUIDField(), required=False)

    def validate(self, attrs):
        if attrs['Sprint_end_date'] < attrs['Sprint_start_date']:
            raise serializers.ValidationError({'Sprint_end_date': 'Must be on or after Sprint_start_date.'})
        return attrs


class SprintBulkSerializer(serializers.Serializer):
    sprints = SprintCreateItemSerializer(many=True, allow_empty=False)

    def to_internal_value(self, data):
        try:
            return super().to_internal_value(data)
        except serializers.ValidationError as error:
            items = error.detail.get('sprints') if isinstance(error.detail, dict) else None
            if isinstance(items, list):
                raise serializers.ValidationError({
                    'sprints': {index: item for index, item in enumerate(items) if item}
                }) from error
            raise

    def validate(self, attrs):
        project = self.context['project']
        member_ids = {project.created_by_id}
        member_ids.update(project.team_members.values_list('pk', flat=True))
        member_ids.update(project.project_managers.values_list('pk', flat=True))
        referenced_ids = {user_id for sprint in attrs['sprints']
                          for user_id in sprint.get('team_members', [])}
        users = UserData.objects.in_bulk(referenced_ids)
        client_ids = set()
        errors = {}
        for index, sprint in enumerate(attrs['sprints']):
            item_errors = {}
            client_id = sprint.get('client_id')
            if client_id:
                if client_id in client_ids:
                    item_errors['client_id'] = 'Must be unique within the batch.'
                client_ids.add(client_id)
            if project.start_date and sprint['Sprint_start_date'] < project.start_date:
                item_errors['Sprint_start_date'] = 'Sprint starts before the project.'
            if project.end_date and sprint['Sprint_end_date'] > project.end_date:
                item_errors['Sprint_end_date'] = 'Sprint ends after the project.'
            if any(user_id not in member_ids or user_id not in users or
                   users[user_id].account_status != 'active'
                   for user_id in sprint.get('team_members', [])):
                item_errors['team_members'] = 'Users must be active project members.'
            if item_errors:
                errors[index] = item_errors
        if errors:
            raise serializers.ValidationError({'sprints': errors})
        return attrs
