from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from api.models import Department, UserData
from apps.roles.permissions import effective_permissions, require_user_relationships, resolve_role_object
from apps.users.services import UserService
from apps.core.utils import normalize_aliases, validate_model_attributes


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, trim_whitespace=False)
    role = serializers.CharField(write_only=True, required=False)
    department = serializers.CharField(write_only=True, required=False)
    skills = serializers.ListField(child=serializers.CharField(max_length=100), write_only=True, required=False)
    INPUT_ALIASES = {
        'User_Name': 'user_name', 'username': 'user_name', 'Employee_ID': 'employee_id',
        'Employee_Id': 'employee_id', 'First_Name': 'first_name', 'Last_Name': 'last_name',
        'Email': 'email', 'Alternate_Email': 'alternate_email', 'Password': 'password',
        'Designation': 'designation', 'Department': 'department', 'Role': 'role',
        'Date_Of_Joining': 'date_of_joining', 'Employment_Type': 'employment_type',
        'Phone_Number': 'phone_number', 'Location': 'location', 'Account_Status': 'account_status',
        'Bio': 'bio', 'Linkedin_Profile': 'linkedin_profile', 'Github_Profile': 'github_profile',
        'manager_id': 'manager', 'project_ids': 'default_projects', 'Skills': 'skills',
    }

    def to_internal_value(self, data):
        values = normalize_aliases(data, self.INPUT_ALIASES)
        if values.get('manager') == '':
            values['manager'] = None
        return super().to_internal_value(values)

    class Meta:
        model = UserData
        fields = ('id', 'user_name', 'employee_id', 'first_name', 'last_name',
                  'email', 'alternate_email', 'password', 'designation',
                  'department_link', 'date_of_joining', 'employment_type',
                  'manager', 'phone_number', 'location', 'role_link',
                  'account_status', 'bio', 'linkedin_profile', 'github_profile',
                  'default_projects', 'role', 'department', 'skills', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')
        extra_kwargs = {'user_name': {'validators': []}, 'email': {'validators': []}}

    def validate_user_name(self, value):
        if '@' in value:
            raise serializers.ValidationError('Username cannot contain @.')
        query = UserData.objects.filter(user_name__iexact=value)
        if self.instance:
            query = query.exclude(pk=self.instance.pk)
        if query.exists():
            raise serializers.ValidationError('Username already exists.')
        return value

    def validate_email(self, value):
        value = self._company_email(value)
        query = UserData.objects.filter(email__iexact=value)
        if self.instance:
            query = query.exclude(pk=self.instance.pk)
        if query.exists():
            raise serializers.ValidationError('Email already exists.')
        return value

    @staticmethod
    def _company_email(value):
        value = value.strip().lower()
        if value.rsplit('@', 1)[-1] not in ('tachyonautomations.com', 'tachyonadvancedsystems.com'):
            raise serializers.ValidationError('Use a tachyonautomations.com or tachyonadvancedsystems.com email.')
        return value

    def validate_alternate_email(self, value):
        return self._company_email(value) if value else value

    def validate_department(self, value):
        name = Department.normalize_name(value)
        if name not in Department.ALLOWED_DEPARTMENTS:
            raise serializers.ValidationError('Invalid department.')
        return name

    def validate_department_link(self, value):
        if value is not None and value.name not in Department.ALLOWED_DEPARTMENTS:
            raise serializers.ValidationError('Invalid department.')
        return value

    def validate(self, attrs):
        if 'role' in attrs:
            role = resolve_role_object(attrs.pop('role'))
            if role is None:
                raise serializers.ValidationError({'role': 'Invalid role.'})
            if 'role_link' in attrs and attrs['role_link'] != role:
                raise serializers.ValidationError({'role': 'Conflicting role assignments.'})
            attrs['role_link'] = role
        if 'department' in attrs and attrs.get('department_link') is not None and attrs['department'] != attrs['department_link'].name:
            raise serializers.ValidationError({'department': 'Conflicting department assignments.'})
        if self.instance is None:
            missing = {field: 'This field is required.' for field in ('password', 'role_link', 'employment_type') if not attrs.get(field)}
            if not attrs.get('department') and not attrs.get('department_link'):
                missing['department'] = 'This field is required.'
            if missing:
                raise serializers.ValidationError(missing)
        require_user_relationships(self.context['request'].user, attrs, self.instance)
        candidate = validate_model_attributes(UserData, self.instance, {key: value for key, value in attrs.items() if key not in ('department', 'skills')})
        if 'password' in attrs:
            validate_password(attrs['password'], candidate)
        return attrs

    def create(self, validated_data):
        user = UserData()
        user.set_password(validated_data['password'])
        validated_data['password'] = user.password
        return self._save_profile(user, validated_data)

    def update(self, instance, validated_data):
        if 'password' in validated_data:
            instance.set_password(validated_data['password'])
            validated_data['password'] = instance.password
        return self._save_profile(instance, validated_data)

    def _save_profile(self, instance, data):
        if {'department', 'default_projects', 'skills'} & data.keys():
            values = dict(data)
            department = values.pop('department', None)
            projects = values.pop('default_projects', None)
            skills = values.pop('skills', None)
            return UserService.save_profile_with_assignments(instance, values, department=department, projects=projects, skills=skills)
        if instance._state.adding:
            return super().create(data)
        return super().update(instance, data)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['role'] = instance.role_link.name if instance.role_link_id else ''
        data['department'] = instance.department_link.name if instance.department_link_id else ''
        data['skills'] = [row.skill_link.name for row in instance.skills.all() if row.skill_link_id]
        data['project_ids'] = data['default_projects']
        data['permissions'] = effective_permissions(instance)
        return data


