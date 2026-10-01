from rest_framework import serializers

from api.models import Sprint, SprintOffDay, UserData
from apps.roles.permissions import require_project_scope


class SprintSerializer(serializers.ModelSerializer):
    off_days = serializers.ListField(child=serializers.DateField(), required=False, write_only=True)

    class Meta:
        model = Sprint
        fields = ('id', 'project', 'Sprint_No', 'Sprint_Name',
                  'Sprint_start_date', 'Sprint_end_date', 'Number_of_days',
                  'exclude_weekends', 'Status', 'team_members',
                  'points_per_working_day', 'off_days', 'Created_at', 'Updated_at')
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
        if 'off_days' in attrs and (len(attrs['off_days']) != len(set(attrs['off_days'])) or
                                   any(day < start or day > end for day in attrs['off_days'])):
            raise serializers.ValidationError({'off_days': 'Dates must be unique and within the sprint.'})
        if 'team_members' in attrs:
            member_ids = {project.created_by_id}
            member_ids.update(project.team_members.values_list('pk', flat=True))
            member_ids.update(project.project_managers.values_list('pk', flat=True))
            if any(user.pk not in member_ids or user.account_status != 'active'
                   for user in attrs['team_members']):
                raise serializers.ValidationError({'team_members': 'Users must be active project members.'})
        return attrs

    def create(self, validated_data):
        off_days = validated_data.pop('off_days', [])
        sprint = super().create(validated_data)
        self._save_off_days(sprint, off_days)
        return sprint

    def update(self, instance, validated_data):
        off_days = validated_data.pop('off_days', None)
        sprint = super().update(instance, validated_data)
        if off_days is not None:
            sprint.off_days.all().delete()
            self._save_off_days(sprint, off_days)
        return sprint

    @staticmethod
    def _save_off_days(sprint, dates):
        SprintOffDay.objects.bulk_create(
            [SprintOffDay(sprint=sprint, date=day) for day in dates], batch_size=200
        )
        sprint.Number_of_days = sprint.working_days(dates)
        Sprint.objects.filter(pk=sprint.pk).update(Number_of_days=sprint.Number_of_days)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['off_days'] = [day.date for day in instance.off_days.all()]
        return data


class SprintCreateItemSerializer(serializers.Serializer):
    client_id = serializers.CharField(max_length=100, required=False)
    Sprint_No = serializers.CharField(max_length=20, required=False, allow_blank=True)
    Sprint_Name = serializers.CharField(max_length=200)
    Sprint_start_date = serializers.DateField()
    Sprint_end_date = serializers.DateField()
    exclude_weekends = serializers.BooleanField(required=False)
    team_members = serializers.ListField(child=serializers.UUIDField(), required=False)
    off_days = serializers.ListField(child=serializers.DateField(), required=False)

    def validate(self, attrs):
        if attrs['Sprint_end_date'] < attrs['Sprint_start_date']:
            raise serializers.ValidationError({'Sprint_end_date': 'Must be on or after Sprint_start_date.'})
        if len(attrs.get('off_days', [])) != len(set(attrs.get('off_days', []))) or any(
            day < attrs['Sprint_start_date'] or day > attrs['Sprint_end_date']
            for day in attrs.get('off_days', [])
        ):
            raise serializers.ValidationError({'off_days': 'Dates must be unique and within the sprint.'})
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
