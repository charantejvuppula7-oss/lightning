import json

from api.models import Project, ProjectResourceLink
from apps.dependencies.services import create_dependencies
from apps.features.services import create_features
from apps.milestones.services import create_milestones
from apps.sprints.services import create_sprints
from apps.tasks.services import create_tasks


def create_project(validated_data, user):
    """
    Orchestrate the holistic creation of a project and its nested work hierarchy.

    Execution sequence:
      1. Extracts nested collections (milestones, sprints, tasks, dependencies, members, managers, departments, links).
      2. Instantiates and saves the parent Project model with resolved lookup attributes.
      3. Binds Many-to-Many relationships for team members, managers, and departments.
      4. Bulk-creates external resource link records.
      5. Provisions milestones via `create_milestones`.
      6. Provisions features under those milestones via `create_features`.
      7. Provisions agile sprints via `create_sprints`.
      8. Bulk-creates tasks assigned to sprints/features via `create_tasks` and schedules notices.
      9. Links dependency predecessor/successor graphs via `create_dependencies`.

    Args:
        validated_data (dict): Validated project specification dictionary from ProjectCreateSerializer.
        user (UserData): The authenticated creator of the project.

    Returns:
        tuple[Project, dict]: A tuple of:
            - The newly created and persisted Project model instance.
            - A references dictionary mapping client temporary IDs to real database UUIDs for sprints and tasks.
    """
    milestones_data = validated_data.pop('milestones', [])
    sprints_data = validated_data.pop('sprints', [])
    tasks_data = validated_data.pop('tasks', [])
    dependencies_data = validated_data.pop('dependencies', [])
    members = validated_data.pop('team_members', [])
    managers = validated_data.pop('project_managers', [])
    departments = validated_data.pop('departments', [])
    resource_links = validated_data.pop('resource_links', [])
    names = {key: validated_data.pop(key) for key in
             ('customer_name', 'priority_name', 'project_type_name') if key in validated_data}
    users = validated_data.pop('_users', {})

    project = Project(created_by=user, **validated_data)
    for key, value in names.items():
        setattr(project, key.removesuffix('_name'), value)
    project.save()
    project.team_members.set(members)
    project.project_managers.set(managers)
    project.departments.set(departments)
    ProjectResourceLink.objects.bulk_create(
        [ProjectResourceLink(project=project, url=url) for url in resource_links], batch_size=200
    )

    milestones = create_milestones(project, user, milestones_data)
    task_specs = [(data, None) for data in tasks_data]
    task_specs.extend(create_features(milestones))
    milestone_refs = {data['client_id']: milestone for milestone, data in milestones if data.get('client_id')}
    for data, _ in task_specs:
        ref = data.pop('milestone_ref', None)
        if ref:
            try:
                metadata = json.loads(data.get('Remarks') or '{}')
            except (ValueError, TypeError):
                metadata = {'notes': data.get('Remarks', '')}
            if not isinstance(metadata, dict):
                metadata = {'notes': data.get('Remarks', '')}
            data['Remarks'] = json.dumps({**metadata, 'milestone_id': str(milestone_refs[ref].pk)})
    _, sprints = create_sprints(project, sprints_data)
    task_refs = create_tasks(project, user, task_specs, sprints, users)
    create_dependencies(task_refs, dependencies_data, users)
    return project, {'sprints': {ref: str(sprint.pk) for ref, sprint in sprints.items()},
                     'tasks': {ref: str(task.pk) for ref, task in task_refs.items()}}

