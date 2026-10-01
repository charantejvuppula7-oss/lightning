from django.db import models
import uuid

class Milestones(models.Model):
    """
    Represents milestones within a project.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey('Project', on_delete=models.CASCADE)
    task = models.ForeignKey('Task', on_delete=models.CASCADE, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    name = models.CharField(max_length=100)
    due_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey('UserData', on_delete=models.CASCADE, related_name='created_milestones')
    updated_by = models.ForeignKey('UserData', on_delete=models.CASCADE, related_name='updated_milestones')

    def __init__(self, *args, **kwargs):
        if 'Project_ID' in kwargs:
            kwargs['project'] = kwargs.pop('Project_ID')
        if 'Task_ID' in kwargs:
            kwargs['task'] = kwargs.pop('Task_ID')
        if 'Milestone_Descripition' in kwargs:
            kwargs['description'] = kwargs.pop('Milestone_Descripition')
        if 'Milestone_Name' in kwargs:
            kwargs['name'] = kwargs.pop('Milestone_Name')
        if 'Due_Date' in kwargs:
            kwargs['due_date'] = kwargs.pop('Due_Date')
        if 'Created_By' in kwargs:
            kwargs['created_by'] = kwargs.pop('Created_By')
        if 'Updated_By' in kwargs:
            kwargs['updated_by'] = kwargs.pop('Updated_By')
        super().__init__(*args, **kwargs)

    @property
    def Project_ID(self):
        return self.project

    @Project_ID.setter
    def Project_ID(self, value):
        self.project = value

    @property
    def Task_ID(self):
        return self.task

    @Task_ID.setter
    def Task_ID(self, value):
        self.task = value

    @property
    def Milestone_Descripition(self):
        return self.description

    @Milestone_Descripition.setter
    def Milestone_Descripition(self, value):
        self.description = value

    @property
    def Milestone_Name(self):
        return self.name

    @Milestone_Name.setter
    def Milestone_Name(self, value):
        self.name = value

    @property
    def Due_Date(self):
        return self.due_date

    @Due_Date.setter
    def Due_Date(self, value):
        self.due_date = value

    @property
    def Created_By(self):
        return self.created_by

    @Created_By.setter
    def Created_By(self, value):
        self.created_by = value

    @property
    def Updated_By(self):
        return self.updated_by

    @Updated_By.setter
    def Updated_By(self, value):
        self.updated_by = value

    def __str__(self):
        return self.name

    def validate_deletion(self):
        from django.core.exceptions import ValidationError
        if self.features.exists():
            raise ValidationError({'detail': 'Milestone has dependent features.'})
