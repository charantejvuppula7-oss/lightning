# PMS Backend

Django 6 and DRF backend with session authentication, permission-based RBAC,
explicit resource APIViews, PostgreSQL support, and ASGI event streams.

## Structure

```text
backend/
├── config/                 Django settings, URLs, ASGI and WSGI
├── apps/
│   ├── users/              Accounts, login, sessions and profiles
│   ├── roles/              Permission schema, authorization and role CRUD
│   ├── projects/           Project API
│   ├── features/           Feature API
│   ├── tasks/              Task API and status transitions
│   ├── sprints/            Sprint CRUD and project-creation service
│   ├── dependencies/       Task dependency CRUD and creation service
│   ├── milestones/         Milestone API
│   ├── notifications/      Deadline alerts, notification API and email scheduling
│   ├── chat/               Project chat history, sending and SSE stream
│   ├── audit/              Audit and security logging
│   └── core/               HTTP middleware, errors, pagination and shared views
├── services/email.py       Shared Microsoft Graph email delivery
├── api/models/             Existing model ownership and database tables
├── api/migrations/         Existing migration history and RBAC data migration
├── tests/                  API flow tests
├── manage.py
└── requirements.txt
```

`api` remains the Django app label for existing tables and migrations. The
Sprint, Task, and TaskDependency class definitions live in their feature apps'
`models/` packages; `api.models` exports them for existing imports.

## Authentication and permissions

Fetch `GET /api/auth/csrf/`, then send its token in `X-CSRFToken` with login and
other unsafe requests. Login at `POST /api/auth/login/` accepts username or email
in `identifier`. The backend uses a database-backed seven-day session; send
cookies with requests. `GET /api/auth/session/` returns the current user and
effective permissions. `POST /api/auth/logout/` invalidates the session.

Roles store permissions in `Role.permissions` as nested module/action booleans,
for example `{"Projects": {"View": true, "Edit": false}}`. Non-admin roles are
denied missing or disabled permissions. The administrator role bypasses module
permission values, while project scope, authentication and workflow checks stay
in force where applicable. Permission changes take effect on the next request
because session authentication reloads the user and role from the database.

Migration `0004_canonical_role_permissions` converts supported legacy flat
permission keys. It gives existing empty Project Manager and Developer roles the
permissions their former hardcoded policy granted. Other empty custom roles
remain denied. The API reads only the nested format after this migration.
Migration `0005` adds a request ID to API request logs and recognizes role audit
events. No existing table or Django app label is renamed.

Role management uses `GET/POST /api/roles/`,
`GET/PUT/PATCH/DELETE /api/roles/<uuid>/`, and `GET /api/roles/schema/`.
Delegated role managers can grant only permissions they already hold. The
administrator role cannot be deleted or renamed through the API.

## Resource APIs

Projects, features, tasks, milestones and users use collection and UUID detail
paths under `/api/`. Collections support `GET` and `POST`; detail paths support
`GET`, `PUT`, `PATCH` and `DELETE`. Collection responses are paginated to at most
100 records. The HTTP methods are explicitly implemented in each feature app.

Sprints use `GET/POST /api/sprints/` and
`GET/PUT/PATCH/DELETE /api/sprints/<uuid>/`. Their actions use the matching
`Projects` View/Create/Edit/Delete role permission and require access to the
owning project. Deleting a sprint leaves its tasks in the project with their
`sprint` field cleared.

`POST /api/projects/<uuid>/sprints/bulk/` accepts `{"sprints": [...]}` and
creates the whole batch atomically. Each item uses the existing sprint field
names (`Sprint_Name`, `Sprint_start_date`, `Sprint_end_date`) and may include a
request-only `client_id` and `team_members`. The response pairs each `client_id`
with the created UUID. Validation errors identify the submitted item index.
Sprints and sprint memberships are inserted in batches; the entire request is
atomic.

The project creation POST also accepts `sprints`, `tasks`, and `dependencies`
in one transaction. A sprint can use `client_id`; a task uses `sprint_ref` to
refer to it and `temp_id` for dependency references. The response contains a
`references` map for the resulting sprint and task UUIDs. Request references
are not stored in the database. Creating nested milestones, features, tasks, or
dependencies also requires Create permission for each included resource.
Migration `0007` removes the unused stored sprint `order_index`, adds a
project/start-date index, and enforces unique non-self task dependency pairs.

Sprint working days are calculated from the inclusive date range and the
`exclude_weekends` setting. `Number_of_days` is returned as a read-only value.

Task dependencies use `GET/POST /api/dependencies/` and
`GET/PUT/PATCH/DELETE /api/dependencies/<uuid>/`. Their actions use the existing
`Dependencies` View/Create/Edit/Delete role permissions and require access to
the dependency task's project. A dependency can reference another task in the
same project through `depends_on`; self, duplicate, cross-project, and circular
task links are rejected.

Tasks begin as `open`. `PATCH /api/tasks/<uuid>/` advances status through
`in_progress`, `in_review`, and `completed`; the `Task` model checks transitions.
Project membership and assignment still limit access. User onboarding and task
assignment emails are stored in the database transaction and dispatched after
commit. The onboarding email directs the user to password reset and does not
store or send the temporary password.
The shared email client reads Microsoft Graph credentials only from environment
variables; missing configuration causes delivery to fail without a network call.
Request middleware records safe request metadata and emits structured log lines.
Business audit rows are written in the resource transaction, so an audit write
failure rolls back the resource change. They remain separate from API request logs.

## Notifications and chat

`python manage.py generate_due_notifications` checks tasks and dependencies with
deadlines through the local date, excludes completed items, and stores one
notification per recipient/resource/type/day. Run it from the deployment
scheduler at least daily. Notification endpoints are `GET /api/notifications/`,
`GET /api/notifications/unread-count/`,
`PATCH /api/notifications/<uuid>/read/`, and
`PATCH /api/notifications/mark-all-read/`; each request is scoped to the signed-in
user. The list accepts `is_read=true|false` and uses the standard pagination.

Project chat history is available at
`GET /api/projects/<uuid>/chat/messages/`. Send through `POST` on the same
path with non-empty `content` and an optional stable `client_id`; retries with
that ID return the saved message. Open
`GET /api/projects/<uuid>/chat/stream/` for `new_message` SSE events.
Chat requires Projects.View and project membership, including default project
membership.
Notifications stream from `GET /api/notifications/stream/` as
`new_notification` events. Both streams use the existing session cookie, read
committed database rows every two seconds, and support automatic EventSource
reconnect through `Last-Event-ID`. Use the paginated REST endpoints for initial
history. No broker is required. The frontend is not present in this workspace,
so its notification bell and chat client still need to consume these APIs.

Email delivery also has a durable outbox. Immediate delivery uses at most four
workers. Run `python manage.py deliver_email_outbox` from the deployment
scheduler at least once a minute to retry failed jobs and recover interrupted
delivery. Set `FRONTEND_URL` to the trusted frontend origin used in onboarding
emails. The outbox uses at-least-once delivery: a crash after the provider
accepts an email but before the sent mark is saved can result in a duplicate.

## Run and verify

Set `USE_SQLITE=True` for the local SQLite database; PostgreSQL is the default.
Run migrations before serving an existing database. A production deployment can
set `DJANGO_SETTINGS_MODULE=config.settings.production` and must provide
`SECRET_KEY` and `ALLOWED_HOSTS`.

```powershell
.\venv\Scripts\python.exe manage.py migrate
.\venv\Scripts\python.exe manage.py check
.\venv\Scripts\python.exe manage.py test
.\venv\Scripts\python.exe -m uvicorn config.asgi:application --port 8000
```
