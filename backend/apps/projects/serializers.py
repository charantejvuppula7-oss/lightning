from rest_framework import serializers
from django.utils.text import slugify

from api.models import Project, ProjectResourceLink, UserData, Milestone_Features, Task, TaskDependency
from apps.roles.permissions import require_permission, require_project_members
from apps.core.utils import validate_model_attributes
from apps.sprints.serializers import SprintCreateItemSerializer


def is_project_manager_role(name):
    return slugify(str(name or '').replace('_', ' ')) in ('admin', 'administrator', 'pm', 'project-manager')


class ProjectSerializer(serializers.ModelSerializer):
    """
    Standard ModelSerializer for Project representations and individual project updates.
    """
    resource_links = serializers.ListField(child=serializers.URLField(max_length=500), required=False, write_only=True)
    customer_name = serializers.CharField(max_length=200, required=False, allow_blank=True, write_only=True)
    priority_name = serializers.ChoiceField(choices=('low', 'medium', 'high'), required=False, write_only=True)
    project_type_name = serializers.ChoiceField(choices=(
        'product development', 'client project', 'internal tool', 'research', 'maintenance',
        'web', 'mobile', 'desktop', 'other',
    ), required=False, write_only=True)

    class Meta:
        model = Project
        fields = ('id', 'project_code', 'project_name', 'description', 'customer_link',
                  'priority_link', 'project_type_link', 'departments', 'created_by',
                  'project_managers', 'start_date', 'end_date', 'team_members',
                  'points_per_working_day', 'resource_links', 'customer_name',
                  'priority_name', 'project_type_name', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_by', 'created_at', 'updated_at')

    def validate(self, attrs):
        """
        Validate project dates against child sprints/milestones and check actor membership rights.

        Args:
            attrs (dict): Serializer input data.

        Returns:
            dict: Validated attributes.

        Raises:
            ValidationError: If project start/end dates conflict with existing sprints or milestones.
        """
        if any(user.account_status != 'active' or not is_project_manager_role(user.role_link.name if user.role_link_id else '')
               for user in attrs.get('project_managers', [])):
            raise serializers.ValidationError({'project_managers': 'Select an active project manager or administrator.'})
        require_project_members(self.context['request'].user, attrs, self.instance)
        validate_model_attributes(Project, self.instance, {
            key: value for key, value in attrs.items()
            if key in ('project_code', 'project_name', 'description', 'customer_link',
                       'priority_link', 'project_type_link', 'start_date', 'end_date',
                       'points_per_working_day')
        })
        if self.instance and ('start_date' in attrs or 'end_date' in attrs):
            start = attrs.get('start_date', self.instance.start_date)
            end = attrs.get('end_date', self.instance.end_date)
            if start and self.instance.sprints.filter(Sprint_start_date__lt=start).exists():
                raise serializers.ValidationError({'start_date': 'Existing sprint starts before the project.'})
            if end and self.instance.sprints.filter(Sprint_end_date__gt=end).exists():
                raise serializers.ValidationError({'end_date': 'Existing sprint ends after the project.'})
            if start and self.instance.milestones_set.filter(due_date__lt=start).exists():
                raise serializers.ValidationError({'start_date': 'Existing milestone is due before the project.'})
            if end and self.instance.milestones_set.filter(due_date__gt=end).exists():
                raise serializers.ValidationError({'end_date': 'Existing milestone is due after the project.'})
        return attrs

    def update(self, instance, validated_data):
        """
        Update project instance and synchronize resource link records.

        Args:
            instance (Project): Existing project instance.
            validated_data (dict): Validated fields.

        Returns:
            Project: Updated project instance.
        """
        links = validated_data.pop('resource_links', None)
        names = {key: validated_data.pop(key) for key in
                 ('customer_name', 'priority_name', 'project_type_name') if key in validated_data}
        instance = super().update(instance, validated_data)
        if names:
            for key, value in names.items():
                setattr(instance, key.removesuffix('_name'), value)
            instance.save()
        if links is not None:
            instance.links.all().delete()
            ProjectResourceLink.objects.bulk_create(
                [ProjectResourceLink(project=instance, url=url) for url in links], batch_size=200
            )
        return instance

    def to_representation(self, instance):
        """Add resource_links array and resolved lookup names to the serialized output."""
        data = super().to_representation(instance)
        data['resource_links'] = [link.url for link in instance.links.all()]
        data['customer_name'] = instance.customer_link.name if instance.customer_link_id else ''
        data['priority_name'] = instance.priority_link.name if instance.priority_link_id else ''
        data['project_type_name'] = instance.project_type_link.name if instance.project_type_link_id else ''
        return data



class InitialTaskSerializer(serializers.ModelSerializer):
    description = serializers.CharField(required=False, allow_blank=True, default='')
    temp_id = serializers.CharField(max_length=100, required=False)
    sprint_ref = serializers.CharField(max_length=100, required=False)
    milestone_ref = serializers.CharField(max_length=100, required=False)
    assigned_to = serializers.UUIDField()
    review_by = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = Task
        fields = ('Task_Name', 'description', 'assigned_to', 'review_by',
                  'Due_Date', 'planned_start_date', 'Remarks', 'temp_id', 'sprint_ref', 'milestone_ref')


class InitialFeatureSerializer(serializers.ModelSerializer):
    tasks = InitialTaskSerializer(many=True, required=False)

    class Meta:
        model = Milestone_Features
        fields = ('feature_name', 'description', 'feature_status',
                  'feature_priority', 'feature_start_date', 'feature_due_date', 'tasks')


class InitialMilestoneSerializer(serializers.Serializer):
    client_id = serializers.CharField(max_length=100, required=False)
    name = serializers.CharField(max_length=100)
    description = serializers.CharField(required=False, allow_blank=True)
    start_date = serializers.DateField(required=False, allow_null=True)
    due_date = serializers.DateField()
    features = InitialFeatureSerializer(many=True, allow_empty=False)


class InitialDependencySerializer(serializers.ModelSerializer):
    description = serializers.CharField(required=False, allow_blank=True, default='')
    task_ref = serializers.CharField(max_length=100)
    depends_on_ref = serializers.CharField(max_length=100, required=False)
    assigned_to = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = TaskDependency
        fields = ('task_ref', 'depends_on_ref', 'description', 'dependency_type', 'assigned_to',
                  'due_date', 'status')


class ProjectCreateSerializer(ProjectSerializer):
    """
    Comprehensive creation serializer validating the entire project hierarchy in a single payload.

    Validates:
      - Permission to create milestones, features, tasks, and dependencies.
      - Active status and project membership for all referenced managers, assignees, and reviewers.
      - Date consistency across project, sprints, and milestones.
      - Acyclicity of task dependencies using Kahn's topological sort algorithm.
    """
    team_members = serializers.ListField(child=serializers.UUIDField(), required=False)
    project_managers = serializers.ListField(child=serializers.UUIDField(), required=False)
    milestones = InitialMilestoneSerializer(many=True, required=False)
    sprints = SprintCreateItemSerializer(many=True, required=False)
    tasks = InitialTaskSerializer(many=True, required=False)
    dependencies = InitialDependencySerializer(many=True, required=False)

    class Meta(ProjectSerializer.Meta):
        fields = ProjectSerializer.Meta.fields + ('milestones', 'sprints', 'tasks', 'dependencies')

    def to_internal_value(self, data):
        """Reject unwhitelisted fields on project initialization."""
        unknown = set(data) - set(self.fields)
        if unknown:
            raise serializers.ValidationError({field: 'Unsupported project creation field.'
                                               for field in sorted(unknown)})
        return super().to_internal_value(data)

    def validate(self, attrs):
        """
        Validate all cross-cutting domain invariants, user scopes, date bounds, and dependency graphs.
        """
        actor = self.context['request'].user
        if attrs.get('milestones'):
            require_permission(actor, 'milestone', 'create')
            if any(milestone['features'] for milestone in attrs['milestones']):
                require_permission(actor, 'feature', 'create')
        if attrs.get('tasks') or any(
            feature.get('tasks') for milestone in attrs.get('milestones', [])
            for feature in milestone['features']
        ):
            require_permission(actor, 'task', 'create')
        if attrs.get('dependencies'):
            require_permission(actor, 'dependency', 'create')
        all_tasks = list(attrs.get('tasks', []))
        for milestone in attrs.get('milestones', []):
            for feature in milestone['features']:
                all_tasks.extend(feature.get('tasks', []))

        referenced_users = set(attrs.get('team_members', []))
        referenced_users.update(attrs.get('project_managers', []))
        referenced_users.update(task['assigned_to'] for task in all_tasks)
        referenced_users.update(task['review_by'] for task in all_tasks if task.get('review_by'))
        referenced_users.update(user_id for sprint in attrs.get('sprints', [])
                                for user_id in sprint.get('team_members', []))
        referenced_users.update(dependency['assigned_to'] for dependency in attrs.get('dependencies', [])
                                if dependency.get('assigned_to'))
        users = {actor.pk: actor}
        users.update(UserData.objects.select_related('role_link').in_bulk(referenced_users - {actor.pk}))
        missing = referenced_users - users.keys()
        if missing:
            raise serializers.ValidationError({'users': 'One or more referenced users do not exist.'})

        attrs['team_members'] = [users[user_id] for user_id in attrs.get('team_members', [])]
        attrs['project_managers'] = [users[user_id] for user_id in attrs.get('project_managers', [])]
        project_attrs = {key: value for key, value in attrs.items()
                         if key not in ('milestones', 'sprints', 'tasks', 'dependencies')}
        ProjectSerializer.validate(self, project_attrs)
        if any(user.account_status != 'active' for user in
               attrs['team_members'] + attrs['project_managers']):
            raise serializers.ValidationError({'team_members': 'Project members must be active.'})
        member_ids = {actor.pk}
        member_ids.update(user.pk for user in attrs['team_members'])
        member_ids.update(user.pk for user in attrs['project_managers'])

        sprint_refs = set()
        sprint_errors = {}
        for index, sprint in enumerate(attrs.get('sprints', [])):
            item_errors = {}
            ref = sprint.get('client_id')
            if ref:
                if ref in sprint_refs:
                    item_errors['client_id'] = 'Must be unique within this project.'
                sprint_refs.add(ref)
            if attrs.get('start_date') and sprint['Sprint_start_date'] < attrs['start_date']:
                item_errors['Sprint_start_date'] = 'Sprint starts before the project.'
            if attrs.get('end_date') and sprint['Sprint_end_date'] > attrs['end_date']:
                item_errors['Sprint_end_date'] = 'Sprint ends after the project.'
            if any(user_id not in member_ids or users[user_id].account_status != 'active'
                   for user_id in sprint.get('team_members', [])):
                item_errors['team_members'] = 'Users must be active project members.'
            if item_errors:
                sprint_errors[index] = item_errors
        if sprint_errors:
            raise serializers.ValidationError({'sprints': sprint_errors})

        milestone_errors = {}
        milestone_refs = set()
        for index, milestone in enumerate(attrs.get('milestones', [])):
            ref = milestone.get('client_id')
            if ref:
                if ref in milestone_refs:
                    milestone_errors[index] = {'client_id': 'Must be unique within this project.'}
                milestone_refs.add(ref)
            due_date = milestone['due_date']
            if attrs.get('start_date') and due_date < attrs['start_date']:
                milestone_errors[index] = {'due_date': 'Milestone is due before the project.'}
            if attrs.get('end_date') and due_date > attrs['end_date']:
                milestone_errors[index] = {'due_date': 'Milestone is due after the project.'}
        if milestone_errors:
            raise serializers.ValidationError({'milestones': milestone_errors})

        task_refs = set()
        task_errors = {}
        for index, task in enumerate(all_tasks):
            item_errors = {}
            if not task.get('Task_Name', '').strip():
                item_errors['Task_Name'] = 'Task name is required.'
            assignee = task['assigned_to']
            if assignee not in member_ids or users[assignee].account_status != 'active':
                item_errors['assigned_to'] = 'Assignee must be an active project member.'
            reviewer = task.get('review_by')
            if reviewer and (reviewer not in member_ids or users[reviewer].account_status != 'active'):
                item_errors['review_by'] = 'Reviewer must be an active project member.'
            if not task.get('sprint_ref'):
                item_errors['sprint_ref'] = 'Generate sprints and assign this task to a sprint.'
            elif task['sprint_ref'] not in sprint_refs:
                item_errors['sprint_ref'] = 'Sprint reference does not exist.'
            if task.get('milestone_ref') and task['milestone_ref'] not in milestone_refs:
                item_errors['milestone_ref'] = 'Milestone reference does not exist.'
            ref = task.get('temp_id')
            if ref:
                if ref in task_refs:
                    item_errors['temp_id'] = 'Task references must be unique.'
                task_refs.add(ref)
            if item_errors:
                task_errors[index] = item_errors
        if task_errors:
            raise serializers.ValidationError({'tasks': task_errors})

        edges = {}
        dependency_errors = {}
        pairs = set()
        for index, dependency in enumerate(attrs.get('dependencies', [])):
            item_errors = {}
            source = dependency['task_ref']
            target = dependency.get('depends_on_ref')
            if source not in task_refs:
                item_errors['task_ref'] = 'Task reference does not exist.'
            if target and target not in task_refs:
                item_errors['depends_on_ref'] = 'Task reference does not exist.'
            if target and source == target:
                item_errors['depends_on_ref'] = 'A task cannot depend on itself.'
            if target and (source, target) in pairs:
                item_errors['depends_on_ref'] = 'Duplicate task dependency.'
            assignee = dependency.get('assigned_to')
            if assignee and (assignee not in member_ids or users[assignee].account_status != 'active'):
                item_errors['assigned_to'] = 'Assignee must be an active project member.'
            if target:
                pairs.add((source, target))
                edges.setdefault(source, set()).add(target)
            if item_errors:
                dependency_errors[index] = item_errors
        if dependency_errors:
            raise serializers.ValidationError({'dependencies': dependency_errors})

        # Kahn's algorithm detects a cycle in one pass over the submitted graph.
        from collections import deque
        indegree = {ref: 0 for ref in task_refs}
        for targets in edges.values():
            for target in targets:
                indegree[target] += 1
        ready = deque(ref for ref, count in indegree.items() if count == 0)
        visited = 0
        while ready:
            ref = ready.popleft()
            visited += 1
            for target in edges.get(ref, ()):
                indegree[target] -= 1
                if indegree[target] == 0:
                    ready.append(target)
        if visited != len(task_refs):
            raise serializers.ValidationError({'dependencies': 'Circular task dependency.'})
        attrs['_users'] = users
        return attrs


class ProjectCreationResponseSerializer(ProjectSerializer):
    """
    Detailed read-only serializer outputting the complete project tree after creation or deep setup fetch.
    """
    milestones = serializers.SerializerMethodField()
    sprints = serializers.SerializerMethodField()
    tasks = serializers.SerializerMethodField()
    dependencies = serializers.SerializerMethodField()

    class Meta(ProjectSerializer.Meta):
        fields = ProjectSerializer.Meta.fields + ('milestones', 'sprints', 'tasks', 'dependencies')

    def get_milestones(self, project):
        """Serialize nested milestones and their child features."""
        return [
            {'id': milestone.pk, 'name': milestone.name, 'description': milestone.description,
             'start_date': milestone.start_date, 'due_date': milestone.due_date,
             'features': [
                 {'id': feature.pk, 'feature_name': feature.feature_name,
                  'description': feature.description, 'feature_status': feature.feature_status,
                  'feature_priority': feature.feature_priority,
                  'feature_start_date': feature.feature_start_date,
                  'feature_due_date': feature.feature_due_date}
                 for feature in milestone.features.all()]}
            for milestone in project.milestones_set.all()
        ]

    def get_sprints(self, project):
        """Serialize project sprints and off-days."""
        return [
            {'id': sprint.pk, 'Sprint_No': sprint.Sprint_No,
             'Sprint_Name': sprint.Sprint_Name,
             'Sprint_start_date': sprint.Sprint_start_date,
             'Sprint_end_date': sprint.Sprint_end_date,
             'exclude_weekends': sprint.exclude_weekends,
             'off_days': [day.date for day in sprint.off_days.all()],
             'Status': sprint.Status,
             'team_members': [user.pk for user in sprint.team_members.all()]}
            for sprint in project.sprints.all()
        ]

    def get_tasks(self, project):
        """Serialize tasks belonging to the project."""
        return [
            {'id': task.pk, 'Task_Name': task.Task_Name,
             'description': task.description, 'Remarks': task.Remarks,
             'review_by': task.review_by_id,
             'assigned_to': task.assigned_to_id, 'feature': task.feature_id,
             'sprint': task.sprint_id, 'status': task.status,
             'planned_start_date': task.planned_start_date, 'Due_Date': task.Due_Date}
            for task in project.tasks.all()
        ]

    def get_dependencies(self, project):
        """Serialize task dependencies across all project tasks."""
        return [
            {'id': dependency.pk, 'task': dependency.task_id,
             'depends_on': dependency.depends_on_id,
             'description': dependency.description, 'dependency_type': dependency.dependency_type,
             'assigned_to': dependency.assigned_to_id,
             'due_date': dependency.due_date, 'status': dependency.status}
            for task in project.tasks.all() for dependency in task.dependencies.all()
        ]

