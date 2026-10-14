from django.db import models
import uuid

class Skills(models.Model):
    """
    Represents a single skill associated with a user account.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    person = models.ForeignKey(
        'UserData',
        on_delete=models.CASCADE,
        related_name='skills'
    )
    skill_link = models.ForeignKey(
        'Skill',
        on_delete=models.PROTECT,
        null=True,
        blank=True
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if 'skill' in kwargs:
            self.skill = kwargs['skill']

    @property
    def skill(self):
        return self.skill_link.name if self.skill_link else ""

    @skill.setter
    def skill(self, value):
        from api.models import Skill
        if not value:
            self.skill_link = None
            return
        if isinstance(value, Skill):
            self.skill_link = value
        elif isinstance(value, str):
            self.skill_link, _ = Skill.objects.get_or_create(name=value.strip())

    def __str__(self):
        return f"{self.person.user_name} - {self.skill}"