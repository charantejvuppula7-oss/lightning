#!/usr/bin/env python
"""
========================================================================================
PROJECT MANAGEMENT BACKEND - DEVELOPER ONBOARDING & ARCHITECTURAL GUIDE
========================================================================================

Welcome to the backend codebase! This file serves as the administrative entry point
for Django management commands as well as the initial onboarding manual for developers.

----------------------------------------------------------------------------------------
1. ARCHITECTURAL OVERVIEW
----------------------------------------------------------------------------------------
The backend is built with Python 3.10+ and Django / Django REST Framework (DRF).
It adopts a clean, layered modular architecture designed for maintainability, security,
and auditability:

  - `config/`         : Global project settings (base, local, production), ASGI/WSGI
                        configurations, and master URL routing (`config/urls.py`).
  - `apps/`           : Modular domain applications encapsulating specific features:
      * `users`       : User management, authentication, JWT tokens, profile management.
      * `roles`       : Role-based access control (RBAC), permission definitions.
      * `projects`    : Project lifecycle, assignments, metadata, team associations.
      * `milestones`  : Project milestone planning, tracking, and deadlines.
      * `features`    : Milestone features, grouping of tasks.
      * `sprints`     : Agile sprints, sprint off-days, sprint member allocation.
      * `tasks`       : Work items, task status progression, assignees, reviewers.
      * `dependencies`: Task-to-task dependency graphs and execution order.
      * `calendar`    : Calendar view aggregations across sprints, milestones, tasks.
      * `chat`        : Messaging, threads, mentions, and project/task discussions.
      * `notifications`: In-app notifications, email dispatch queues, automated alerts.
      * `audit`       : Audit logging of write operations (create, update, delete).
      * `core`        : Shared utilities, base views (`ResourceAPIView`), middleware,
                        pagination, exception handlers, and SSE streaming.
  - `api/`            : Core database models, legacy lookup tables, and schemas.
  - `services/`       : Infrastructure-level shared services (e.g. SMTP email engine).

----------------------------------------------------------------------------------------
2. STEP-BY-STEP GUIDE: HOW TO ADD A NEW FEATURE TO THE BACKEND
----------------------------------------------------------------------------------------
Follow these standardized steps whenever you implement a new feature or module:

  STEP 1: Create or Locate the Domain App
  --------------------------------------------------------------------------------------
  If the feature fits into an existing app (e.g., adding an endpoint to `tasks`),
  work inside `apps/tasks/`. If creating a brand new module:
    1. Create a folder under `apps/<new_feature>/`
    2. Add `__init__.py`, `apps.py`, `models.py`, `serializers.py`, `services.py`,
       `views.py`, `urls.py`, and `tests.py`.
    3. In `apps/<new_feature>/apps.py`, define the AppConfig:
         class NewFeatureConfig(AppConfig):
             default_auto_field = 'django.db.models.BigAutoField'
             name = 'apps.<new_feature>'
    4. Register `'apps.<new_feature>'` in `INSTALLED_APPS` in `config/settings/base.py`.

  STEP 2: Define the Database Model (`models.py`)
  --------------------------------------------------------------------------------------
  Define your data entities with appropriate constraints, foreign keys, and indexes:
    - Use UUIDs or BigAutoField for primary keys based on system conventions.
    - Add `created_at` (DateTimeField auto_now_add=True) and `updated_at` (auto_now=True).
    - Provide a descriptive `__str__` method and `class Meta` (ordering, verbose names).
    - Ensure relational foreign keys define `on_delete` behaviors (`CASCADE`, `PROTECT`, etc.).

  STEP 3: Generate and Apply Database Migrations
  --------------------------------------------------------------------------------------
  Run the migration commands via this utility:
    $ python manage.py makemigrations <new_feature>
    $ python manage.py migrate
  Always verify the generated migration script in `apps/<new_feature>/migrations/`.

  STEP 4: Implement the Service Layer / Business Logic (`services.py`)
  --------------------------------------------------------------------------------------
  Keep views thin! All complex domain logic, data transformations, cross-table
  transactions, and notifications belong in `services.py`:
    - Wrap multi-table modifications inside `with transaction.atomic():`.
    - Emit audit logs or trigger notification events from here if needed.
    - Return clean domain objects or dictionaries for serializers to consume.

  STEP 5: Build Serializers (`serializers.py`)
  --------------------------------------------------------------------------------------
  Create DRF serializers for input validation and output representation:
    - `NewFeatureSerializer` (ModelSerializer for full representation).
    - `NewFeatureCreateSerializer` / `NewFeatureUpdateSerializer` (for validation).
    - Implement custom `validate_<field>` or `validate` methods for domain rules.

  STEP 6: Configure Permissions & RBAC (`apps/roles/permissions.py`)
  --------------------------------------------------------------------------------------
  Secure the endpoint by checking user roles and permissions:
    - Register new resource actions in `apps/roles/permissions.py` (e.g., `'feature:read'`,
      `'feature:create'`, `'feature:delete'`).
    - Use `has_permission(request.user, '<resource>', '<action>')` or role helper functions.

  STEP 7: Build Views & API Endpoints (`views.py`)
  --------------------------------------------------------------------------------------
  Inherit from `ResourceAPIView` (from `apps.core.views`) or standard DRF `APIView`:
    - `ResourceAPIView` provides built-in authorization checks via `self.authorized_queryset()`
      and automatic audit logging via `self.audit(request, instance, 'action')`.
    - Use standard HTTP status codes (`HTTP_200_OK`, `HTTP_201_CREATED`, etc.).
    - Implement pagination using `ResourcePagination` for collection endpoints.

  STEP 8: Register URLs (`urls.py`)
  --------------------------------------------------------------------------------------
  1. Define routes in `apps/<new_feature>/urls.py`:
       from django.urls import path
       from .views import NewFeatureListCreateView, NewFeatureDetailView
       urlpatterns = [
           path('', NewFeatureListCreateView.as_view(), name='feature-list-create'),
           path('<uuid:pk>/', NewFeatureDetailView.as_view(), name='feature-detail'),
       ]
  2. Include your app's URLs in `config/urls.py`:
       path('api/v1/<new_feature>/', include('apps.<new_feature>.urls')),

  STEP 9: Write Automated Tests (`tests.py`)
  --------------------------------------------------------------------------------------
  Add unit and integration tests using Django/DRF test frameworks:
    - Test positive scenarios (successful creation, retrieval, updates).
    - Test negative scenarios (unauthorized access, invalid inputs, edge cases).
    - Run tests via: `python manage.py test apps.<new_feature>`

  STEP 10: Run System Checks and Verify
  --------------------------------------------------------------------------------------
  Before opening a pull request:
    $ python manage.py check          # Check for system/configuration errors
    $ python manage.py test           # Run all automated tests
    $ python manage.py runserver      # Launch the local development server

========================================================================================
"""
import os
import sys


def main():
    """
    Main execution entry point for Django management commands.

    Responsibilities:
      1. Sets the default `DJANGO_SETTINGS_MODULE` environment variable to point
         to the project's settings (`config.settings`).
      2. Imports Django's management execution engine `execute_from_command_line`.
      3. Validates that Django is properly installed and the virtual environment is active.
      4. Dispatches the command-line arguments (`sys.argv`) to the appropriate
         subcommand (e.g. `runserver`, `migrate`, `makemigrations`, `test`, `shell`).

    Raises:
      ImportError: If Django cannot be imported, alerting the developer that their
                   virtual environment might be inactive or dependencies are missing.
    """
    # Configure the active settings module for the Django project
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    # Delegate execution to Django command line runner
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()

