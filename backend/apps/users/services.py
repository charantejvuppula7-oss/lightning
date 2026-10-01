"""Coordinated user profile, project membership and skill writes."""

from django.db import transaction

from api.models import Department, Project, Skill, Skills
from apps.audit.services import LogService


class UserService:
    @staticmethod
    @transaction.atomic
    def save_profile_with_assignments(user, attributes, *, department=None, projects=None, skills=None):
        for field, value in attributes.items():
            setattr(user, field, value)
        if department is not None:
            user.department_link, _ = Department.objects.get_or_create(name=department)
        user.save()
        if projects is not None:
            previous_ids = set(user.default_projects.values_list('pk', flat=True))
            project_ids = {project.pk for project in projects}
            user.default_projects.set(projects)
            memberships = Project.team_members.through
            memberships.objects.filter(userdata_id=user.pk, project_id__in=previous_ids - project_ids).delete()
            memberships.objects.bulk_create(
                [memberships(userdata_id=user.pk, project_id=pk) for pk in project_ids],
                ignore_conflicts=True,
            )
        if skills is not None:
            user.skills.all().delete()
            links = [Skill.objects.get_or_create(name=name)[0] for name in dict.fromkeys(skills)]
            Skills.objects.bulk_create([Skills(person=user, skill_link=skill) for skill in links])
        return user
