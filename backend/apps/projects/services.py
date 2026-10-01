from api.models import Project, ProjectResourceLink
from apps.dependencies.services import create_dependencies
from apps.features.services import create_features
from apps.milestones.services import create_milestones
from apps.sprints.services import create_sprints
from apps.tasks.services import create_tasks


def create_project(validated_data, user):
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
    _, sprints = create_sprints(project, sprints_data)
    task_refs = create_tasks(project, user, task_specs, sprints, users)
    create_dependencies(task_refs, dependencies_data, users)
    return project, {'sprints': {ref: str(sprint.pk) for ref, sprint in sprints.items()},
                     'tasks': {ref: str(task.pk) for ref, task in task_refs.items()}}
