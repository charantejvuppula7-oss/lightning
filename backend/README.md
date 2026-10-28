# PMS Backend

Django 6 and DRF backend with session authentication, permission-based RBAC,
explicit resource APIViews, PostgreSQL support, and ASGI event streams.

Ubuntu 26.04 Nginx/systemd setup is documented in [deploy/README.md](../deploy/README.md).

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

## Log retention

Audit and API request logs are retained for seven days. Run
`python manage.py cleanup_logs` to delete existing records older than seven days;
the cutoff uses each record's timestamp and leaves newer records untouched.

On Windows, run `powershell -NoProfile -File scripts/install-log-cleanup.ps1`
from the backend directory once. This installs or updates the current user's
`Company_2_LogCleanup` scheduled task. It runs every 24 hours while that user is logged in,
including when the API is stopped, and catches up after missed runs. Records may
remain for up to 24 hours after reaching seven days. The task uses the backend
virtual environment and database configuration; no additional dependency is needed.
Other deployments should schedule `python manage.py cleanup_logs` every 24 hours using
their existing job scheduler.

## Version caching and rate limits

The browser displays the last validated version from localStorage, then checks
`/api/user/app-version/` once per page load. Login/sidebar share the same request.
There is no version polling timer. A page refresh checks again; an explicit
`window.dispatchEvent(new Event('app:updated'))` also rechecks, and another tab's
version update is reflected through the storage event. An already open page
cannot discover a server deployment without a refresh or an update signal.
Only the public version string is stored; passwords, OTPs and reset tokens are not.

`apps/core/throttling.py` selects the use-case policy. Limits are configured in
`config/settings/base.py`; each view class and HTTP method has its own counter,
shared across IDs and URL aliases. Authenticated requests use the user ID;
anonymous requests use the client IP. Production counters use Redis with the
`lighting_v2` prefix. Nginx is the sole trusted proxy and the backend stays bound
to loopback. Login also uses a normalized, hashed identifier counter across IPs.

| Use case | Limit |
| --- | --- |
| Standard resource reads | 300/minute per endpoint |
| Standard writes and task status | 60/minute per endpoint |
| Session, CSRF and logout | 60/minute per endpoint |
| Login | 10/minute per IP and 5/minute per entered identifier |
| Request password-reset code | 5/hour per IP; 60-second resend delay and 3 requests/10 minutes per account |
| Verify OTP | 20/hour per IP; code invalidates after 5 incorrect guesses |
| Confirm reset | 10/hour per IP; verified token expires and is single-use |
| Version | 30/minute per IP |
| Search | 60/minute per user |
| Analytics and monitoring | 30/minute per endpoint |
| Multipart uploads | 20/minute unless a more specific endpoint policy applies |
| Document downloads | 60/minute |
| Chat send and typing | 60/minute per endpoint |
| Chat presence | 10/minute |
| Stream establishment/reconnection | 10/minute; existing connection frames are not new requests |

HTTP 429 includes both `Retry-After` and JSON `retry_after` seconds. Login and all
password-reset actions show retry countdowns and disable submission until the
deadline; deadlines are stored in sessionStorage so refreshing cannot reset the
displayed wait. The server remains authoritative. OTP resend uses its own timer,
so waiting to resend does not prevent verifying an already received code.
Tests mock the email service; they do not send real messages.

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

Use PostgreSQL for local development: `USE_SQLITE=False`, `POSTGRES_HOST=127.0.0.1`,
`POSTGRES_PORT=5432`, `POSTGRES_DB=companydb`. These match the Company database.
Run migrations before serving an existing database. A production deployment can
set `DJANGO_SETTINGS_MODULE=config.settings.production` and must provide
`SECRET_KEY` and `ALLOWED_HOSTS`.

```powershell
.\venv\Scripts\python.exe manage.py migrate
.\venv\Scripts\python.exe manage.py check
.\venv\Scripts\python.exe manage.py test
.\venv\Scripts\python.exe -m uvicorn config.asgi:application --port 8000
```

Use Uvicorn for local development, including chat and notification streams. Django's
`manage.py runserver` serves WSGI and buffers the asynchronous event stream, leaving
chat on Connecting. From the repository root, `./scripts/start-backend.ps1` starts
the backend with ASGI and reloads it when Python files change.

Transactional email uses Microsoft Graph only. Configure `MS_GRAPH_TENANT_ID`,
`MS_GRAPH_CLIENT_ID`, `MS_GRAPH_CLIENT_SECRET`, and `MS_GRAPH_SENDER_UPN` in the
ignored `backend/.env` file. No SMTP fallback is used.


## Monitoring and database explorer

The frontend uses shared controls in `ui/src/components/common`, its navbar in
`ui/src/layouts`, and the three monitoring screens in `ui/src/features/audit`.
Log state, pagination, formatting, and the page shell are shared within that feature.
Backend queries, model registry, and record operations stay in `apps/admin_panel`.
No additional database tables or migrations are required.

- `GET /api/api-logs/`: filters by method, status code (including `2xx`, `4xx`, `5xx`), search and dates; returns filtered metrics, results and pagination.
- `GET /api/audit-logs/`: filters by action, entity, search and dates; returns results and pagination. Admins, project managers and roles with Audit Logs.View may read it.
- `GET /api/admin/database/tables/`: curated model metadata and counts.
- `GET /api/admin/database/table/<key>/`: paginated, searchable and sortable records.
- `GET/PUT/PATCH/DELETE /api/admin/database/table/<key>/<id>/`: inspect, validate updates, or delete records. Mutations require the normal session and CSRF token, record audit entries transactionally, and block deleting the active admin account.
- `GET /api/search/?q=...`: navbar results scoped to existing resource permissions.

The existing `/api/admin/logs/*` and `/api/admin/db/*` URLs alias the same views.
The database explorer only exposes registered application models; password hashes
and session keys are omitted. Existing record edits retain model validation and
foreign-key protections. API-log polling is excluded from request logging.

## Live project chat

Chat uses authenticated Socket.IO at `/api/socket.io/`, with WebSocket and polling
transports. Messages, replies, reactions, typing and presence use one connection;
history and attachment uploads use REST. Session cookies, password hashes, active
accounts and project membership are checked on join and actions, before broadcasts,
and every 30 seconds for idle connections. Socket actions use the configured cache
(Redis in production) for per-user rate limits.

Run the existing single Uvicorn worker. The deployment Nginx configuration includes
WebSocket upgrade headers; rerun `scripts/deploy.sh` when deploying this change.
Additional workers require a shared Socket.IO manager and presence store first.
