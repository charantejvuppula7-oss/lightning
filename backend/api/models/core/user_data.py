from django.db import models
from django.db.models.functions import Lower
import uuid


class UserData(models.Model):
    """
    Primary user model representing employees and system actors.

    Serves as the custom authentication entity containing personal information,
    organization hierarchy (department and manager), security credentials, and project memberships.
    """

    class Meta:
        constraints = [
            models.UniqueConstraint(Lower('email'), name='unique_user_email_ci'),
            models.UniqueConstraint(Lower('user_name'), name='unique_user_name_ci'),
        ]

    ROLE_CHOICES = [
        ('developer', 'Developer'),
        ('pm', 'Project Manager'),
        ('admin', 'Administrator'),
    ]

    EMPLOYMENT_CHOICES = [
        ('full_time', 'Full Time'),
        ('part_time', 'Part Time'),
        ('contract', 'Contract'),
        ('intern', 'Intern'),
    ]

    ACCOUNT_STATUS = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    # ------------------------
    # Basic Information
    # ------------------------

    user_name = models.CharField(max_length=100, unique=True)
    employee_id = models.CharField(max_length=50, unique=True)

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)

    email = models.EmailField(unique=True)
    alternate_email = models.EmailField(null=True, blank=True)

    password = models.CharField(max_length=128)

    designation = models.CharField(max_length=100, blank=True, default='')
    department_link = models.ForeignKey('Department', on_delete=models.PROTECT, null=True, blank=True)
    date_of_joining = models.DateField()
    employment_type = models.CharField(
        max_length=50,
        choices=EMPLOYMENT_CHOICES,
        default='full_time'
    )

    # ------------------------
    # Manager
    # ------------------------

    manager = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='managed_users'
    )

    # ------------------------
    # Contact
    # ------------------------

    phone_number = models.CharField(max_length=20, blank=True, default='')

    location = models.CharField(
        max_length=100,
        null=True,
        blank=True
    )

    # ------------------------
    # Login & Access
    # ------------------------

    role_link = models.ForeignKey('Role', on_delete=models.PROTECT, null=True, blank=True)
     
    account_status = models.CharField(
        max_length=20,
        choices=ACCOUNT_STATUS,
        default='active'
    )

    # ------------------------
    # Additional Information
    # ------------------------

    bio = models.TextField(
        blank=True,
        null=True
    )

    linkedin_profile = models.URLField(
        blank=True,
        null=True
    )

    github_profile = models.URLField(
        blank=True,
        null=True
    )

    # ------------------------
    # Projects
    # ------------------------

    default_projects = models.ManyToManyField(
        'Project',
        blank=True,
        related_name='members'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __init__(self, *args, **kwargs):
        """Initialize instance and capture string role/department kwargs for deferred lookup."""
        super().__init__(*args, **kwargs)
        # Handle string kwargs or initial values during initialization without hitting DB
        self._role_name = kwargs.get('role')
        self._department_name = kwargs.get('department')

    @property
    def role(self):
        """Get role name string either from pending assignment or referenced Role record."""
        if getattr(self, '_role_name', None) is not None:
            return self._role_name
        return self.role_link.name if self.role_link else ""

    @role.setter
    def role(self, value):
        """Set role via Role instance or string name."""
        from api.models import Role
        if not value:
            self.role_link = None
            self._role_name = ""
            return
        if isinstance(value, Role):
            self.role_link = value
            self._role_name = value.name
        elif isinstance(value, str):
            from apps.roles.permissions import resolve_role_object
            resolved = resolve_role_object(value)
            if resolved:
                self.role_link = resolved
                self._role_name = resolved.name
            else:
                self._role_name = value.strip().lower()

    @property
    def department(self):
        """Get department name string either from pending assignment or referenced Department record."""
        if getattr(self, '_department_name', None) is not None:
            return self._department_name
        return self.department_link.name if self.department_link else ""

    @department.setter
    def department(self, value):
        """Set department via Department instance or string name."""
        from api.models import Department
        if not value:
            self.department_link = None
            self._department_name = ""
            return
        if isinstance(value, Department):
            self.department_link = value
            self._department_name = value.name
        elif isinstance(value, str):
            self._department_name = value.strip()

    def save(self, *args, **kwargs):
        """Resolve deferred role and department references before writing to database."""
        from api.models import Role, Department

        role_name = getattr(self, '_role_name', None)
        if role_name:
            if hasattr(role_name, 'name'):
                self.role_link = role_name
                self._role_name = None
            else:
                from apps.roles.permissions import resolve_role_object
                role_obj = resolve_role_object(role_name)
                if role_obj is None:
                    role_obj = Role.objects.create(name=str(role_name).strip())
                self.role_link = role_obj
                self._role_name = None

        dept_name = getattr(self, '_department_name', None)
        if dept_name:
            self.department_link, _ = Department.objects.get_or_create(name=dept_name)
            self._department_name = None

        super().save(*args, **kwargs)

    @property
    def is_authenticated(self):
        """Compatibility property for Django auth framework."""
        return True

    @property
    def is_anonymous(self):
        """Compatibility property for Django auth framework."""
        return False

    def check_password(self, raw_password):
        """Verify candidate raw password against salted hash."""
        from django.contrib.auth.hashers import check_password
        return check_password(raw_password, self.password)

    def set_password(self, raw_password):
        """Hash raw password and assign to password attribute."""
        from django.contrib.auth.hashers import make_password
        self.password = make_password(raw_password)

    def get_session_auth_hash(self):
        """Generate HMAC session verification hash based on the current password hash."""
        from django.utils.crypto import salted_hmac
        return salted_hmac('api.UserData.get_session_auth_hash', self.password).hexdigest()

    def __str__(self):
        """Return username representation."""
        return self.user_name

