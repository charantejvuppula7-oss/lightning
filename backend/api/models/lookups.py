from django.db import models
import uuid

class DepartmentManager(models.Manager):
    """
    Custom manager for Department that normalizes names upon lookup and creation.
    """
    def get_or_create(self, **kwargs):
        if 'name' in kwargs and kwargs['name']:
            kwargs['name'] = Department.normalize_name(kwargs['name'])
        return super().get_or_create(**kwargs)

    def filter(self, *args, **kwargs):
        if 'name__iexact' in kwargs and kwargs['name__iexact']:
            kwargs['name__iexact'] = Department.normalize_name(kwargs['name__iexact'])
        elif 'name' in kwargs and isinstance(kwargs['name'], str):
            kwargs['name'] = Department.normalize_name(kwargs['name'])
        return super().filter(*args, **kwargs)


class Department(models.Model):
    """
    Department lookup model.
    Encapsulates cost-centers or organizational units.
    Allowed departments are strictly restricted to:
      - Hardware
      - Firmware
      - Software
      - Mechanical
      - Testing
      - Production
      - Quality Assurance
      - Documentation
      - Management
    """
    HARDWARE = 'Hardware'
    FIRMWARE = 'Firmware'
    SOFTWARE = 'Software'
    MECHANICAL = 'Mechanical'
    TESTING = 'Testing'
    PRODUCTION = 'Production'
    QUALITY_ASSURANCE = 'Quality Assurance'
    DOCUMENTATION = 'Documentation'
    MANAGEMENT = 'Management'

    ALLOWED_DEPARTMENTS = [
        HARDWARE,
        FIRMWARE,
        SOFTWARE,
        MECHANICAL,
        TESTING,
        PRODUCTION,
        QUALITY_ASSURANCE,
        DOCUMENTATION,
        MANAGEMENT,
    ]

    DEPARTMENT_CHOICES = [
        (HARDWARE, 'Hardware'),
        (FIRMWARE, 'Firmware'),
        (SOFTWARE, 'Software'),
        (MECHANICAL, 'Mechanical'),
        (TESTING, 'Testing'),
        (PRODUCTION, 'Production'),
        (QUALITY_ASSURANCE, 'Quality Assurance'),
        (DOCUMENTATION, 'Documentation'),
        (MANAGEMENT, 'Management'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    name = models.CharField(
        max_length=100,
        unique=True,
        choices=DEPARTMENT_CHOICES,
    )

    objects = DepartmentManager()

    @classmethod
    def normalize_name(cls, value):
        """
        Normalize department string to one of the 9 canonical allowed department names.
        Handles aliases (e.g. 'QA' -> 'Quality Assurance', 'HW' -> 'Hardware').
        """
        if not value:
            return ""
        val = str(value).strip()
        lower_val = val.lower()

        # Direct case-insensitive match
        for dept in cls.ALLOWED_DEPARTMENTS:
            if lower_val == dept.lower():
                return dept

        alias_map = {
            "qa": cls.QUALITY_ASSURANCE,
            "quality assurance": cls.QUALITY_ASSURANCE,
            "quality_assurance": cls.QUALITY_ASSURANCE,
            "quality assurance (qa)": cls.QUALITY_ASSURANCE,
            "quality": cls.QUALITY_ASSURANCE,
            "hw": cls.HARDWARE,
            "hardware (hw)": cls.HARDWARE,
            "fw": cls.FIRMWARE,
            "firmware (fw)": cls.FIRMWARE,
            "sw": cls.SOFTWARE,
            "software (sw)": cls.SOFTWARE,
            "me": cls.MECHANICAL,
            "mechanical (me)": cls.MECHANICAL,
            "te": cls.TESTING,
            "testing (te)": cls.TESTING,
            "pr": cls.PRODUCTION,
            "production (pr)": cls.PRODUCTION,
            "doc": cls.DOCUMENTATION,
            "docs": cls.DOCUMENTATION,
            "documentation (doc)": cls.DOCUMENTATION,
            "mg": cls.MANAGEMENT,
            "management (mg)": cls.MANAGEMENT,
        }
        return alias_map.get(lower_val, val)

    def clean(self):
        super().clean()
        normalized = self.normalize_name(self.name)
        if normalized in self.ALLOWED_DEPARTMENTS:
            self.name = normalized
        elif self.name not in self.ALLOWED_DEPARTMENTS:
            from django.core.exceptions import ValidationError
            raise ValidationError({
                'name': f"'{self.name}' is not an allowed department. Allowed: {', '.join(self.ALLOWED_DEPARTMENTS)}"
            })

    def save(self, *args, **kwargs):
        normalized = self.normalize_name(self.name)
        if normalized in self.ALLOWED_DEPARTMENTS:
            self.name = normalized
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Role(models.Model):
    """
    Role lookup model.
    Enforces authorization roles (e.g. 'developer', 'pm').
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    name = models.CharField(max_length=50, unique=True)
    description = models.CharField(max_length=200, blank=True, default='')
    color = models.CharField(max_length=30, blank=True, default='#93c5fd')
    is_locked = models.BooleanField(default=False)
    permissions = models.JSONField(default=dict, blank=True)

    @property
    def slug(self):
        from django.utils.text import slugify
        return slugify(self.name) if self.name else ""

    def __str__(self):
        return self.name


class Customer(models.Model):
    """
    Customer lookup model.
    Excludes free-text naming anomalies for corporate client attributes.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    name = models.CharField(max_length=200, unique=True)

    def __str__(self):
        return self.name


class Priority(models.Model):
    """
    Priority lookup model (e.g. 'low', 'medium', 'high').
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    name = models.CharField(max_length=30, unique=True)
    sort_order = models.IntegerField(default=0)

    def __str__(self):
        return self.name


class ProjectType(models.Model):
    """
    Project type lookup model (e.g. 'web', 'mobile').
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name


class Skill(models.Model):
    """
    Skill lookup model.
    Stores standard software skills (e.g. 'python', 'react').
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name
