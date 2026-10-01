"""
Project Model Definition
~~~~~~~~~~~~~~~~~~~~~~~~

Defines the ORM schema for the ``api_project`` table in PostgreSQL.
Each project is created by a Project Manager (PM) and can contain
multiple tasks assigned to different users.

Relationships:
    - ``created_by`` → ForeignKey to ``UserData`` (many projects to one PM)
    - Reverse: ``user.projects.all()`` returns all projects a PM created

Database table: ``api_project``
"""

from django.db import models
import uuid


class Project(models.Model):
    """
    Represents a project created by a Project Manager.

    Each project belongs to exactly one PM (the ``created_by`` user) and
    can contain zero or more tasks. Deleting the PM cascades to delete
    all their projects (and transitively, all tasks within those projects).

    Attributes:
        id (UUIDField): Auto-generated primary key.
        project_name (CharField): Human-readable project title. Max 200 chars.
        description (TextField): Optional longer description of the project.
        created_by (ForeignKey): The PM who owns this project.
        created_at (DateTimeField): Auto-set timestamp when the project is created.
    """
    PRIORITY_CHOICES = [
        ('high', 'High'),
        ('low', 'Low'),
        ('medium', 'Medium'),
    
    ]
    PROJECT_TYPE_CHOICES = [
        ('web', 'Web'),
        ('mobile', 'Mobile'),
        ('desktop', 'Desktop'),
        ('other', 'Other'),
    ]


    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    project_code=models.CharField(max_length=10,default="")
    project_name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    customer_link = models.ForeignKey('Customer', on_delete=models.PROTECT, null=True, blank=True)
    priority_link = models.ForeignKey('Priority', on_delete=models.PROTECT, null=True, blank=True)
    project_type_link = models.ForeignKey('ProjectType', on_delete=models.PROTECT, null=True, blank=True)
    departments = models.ManyToManyField('Department', blank=True, related_name='projects')
    created_by = models.ForeignKey(
        'UserData',
        on_delete=models.CASCADE,
        related_name='projects'
    )
    project_managers = models.ManyToManyField(
        'UserData',
        related_name='managed_projects',
        blank=True
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    team_members = models.ManyToManyField(
        'UserData',
        related_name='assigned_projects',
        blank=True
    )
    points_per_working_day = models.IntegerField(default=2)

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValidationError({'end_date': 'Must be on or after start_date.'})

    def validate_deletion(self):
        from django.core.exceptions import ValidationError
        if (self.tasks.exists() or self.milestones_set.exists() or self.sprints.exists() or
                self.resource_files_set.exists() or self.links.exists() or
                self.activities.exists() or
                hasattr(self, 'chat_room') and self.chat_room.messages.exists()):
            raise ValidationError({'detail': 'Project has dependent records.'})
    
    

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Avoid database queries in __init__. Set name buffers directly instead of calling setters.
        self._customer_name = kwargs.get('customer')
        self._priority_name = kwargs.get('priority')
        self._project_type_name = kwargs.get('project_type')

        # Set default values for name buffers on new objects if links are absent.
        # Use __dict__ to avoid triggering DeferredAttribute.refresh_from_db during .only()/.defer() queries.
        if not self.__dict__.get('customer_link_id') and self._customer_name is None:
            self._customer_name = 'General'
        if not self.__dict__.get('priority_link_id') and self._priority_name is None:
            self._priority_name = 'medium'
        if not self.__dict__.get('project_type_link_id') and self._project_type_name is None:
            self._project_type_name = 'web'

    @property
    def customer(self):
        if getattr(self, '_customer_name', None) is not None:
            return self._customer_name
        return self.customer_link.name if self.customer_link else ""

    @customer.setter
    def customer(self, value):
        from api.models import Customer
        if not value:
            self.customer_link = None
            self._customer_name = ""
            return
        if isinstance(value, Customer):
            self.customer_link = value
            self._customer_name = value.name
        elif isinstance(value, str):
            self._customer_name = value.strip()

    @property
    def priority(self):
        if getattr(self, '_priority_name', None) is not None:
            return self._priority_name
        return self.priority_link.name if self.priority_link else ""

    @priority.setter
    def priority(self, value):
        from api.models import Priority
        if not value:
            self.priority_link = None
            self._priority_name = ""
            return
        if isinstance(value, Priority):
            self.priority_link = value
            self._priority_name = value.name
        elif isinstance(value, str):
            self._priority_name = value.strip().lower()

    @property
    def project_type(self):
        if getattr(self, '_project_type_name', None) is not None:
            return self._project_type_name
        return self.project_type_link.name if self.project_type_link else ""

    @project_type.setter
    def project_type(self, value):
        from api.models import ProjectType
        if not value:
            self.project_type_link = None
            self._project_type_name = ""
            return
        if isinstance(value, ProjectType):
            self.project_type_link = value
            self._project_type_name = value.name
        elif isinstance(value, str):
            self._project_type_name = value.strip().lower()

    def save(self, *args, **kwargs):
        # Resolve buffered string lookups to ForeignKey relations right before database save
        from api.models import Customer, Priority, ProjectType
        
        customer_name = getattr(self, '_customer_name', None)
        if customer_name:
            self.customer_link, _ = Customer.objects.get_or_create(name=customer_name)
            self._customer_name = None  # Clear buffer to read from linked model in future
            
        priority_name = getattr(self, '_priority_name', None)
        if priority_name:
            self.priority_link, _ = Priority.objects.get_or_create(name=priority_name)
            self._priority_name = None
            
        pt_name = getattr(self, '_project_type_name', None)
        if pt_name:
            self.project_type_link, _ = ProjectType.objects.get_or_create(name=pt_name)
            self._project_type_name = None
            
        super().save(*args, **kwargs)

    def __str__(self):
        """Return the project name as the human-readable representation."""
        return self.project_name
