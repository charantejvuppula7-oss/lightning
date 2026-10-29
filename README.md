# Lightning

A React/Vite/Tailwind frontend and Django/DRF modular monolith backed by PostgreSQL.
Session authentication, CSRF protection, project scope and permissions remain enforced
on the server. Socket.IO shares one authenticated connection for chat and notifications.

## Structure

```text
ui/src/
  app/              Routes and application composition
  layouts/          Sidebar, navbar and loading shell
  features/         Business pages, components, APIs and local Tailwind utilities
  shared/           Reused UI primitives, hooks and the HTTP client
  styles/           Tailwind entry point and shared design tokens
backend/
  apps/             Domain APIs, serializers, services and regression tests
  api/models/       Existing model ownership and compatibility exports
  api/migrations/   Preserved database history
  config/           Settings, routing and ASGI
  services/         Microsoft Graph email client
deploy/             Nginx and systemd definitions
scripts/            Deployment and local startup helpers
```

Keep business behavior in its feature. Reuse the existing HTTP client, permission
helpers, modal primitives and feedback hook. Keep compatibility model exports and
existing migrations; matching names are not evidence of duplicate database models.
Do not add per-role page copies, generic repositories or a new state library.

## Development and checks

See [backend setup](backend/README.md), [UI setup](ui/README.md) and
[Ubuntu deployment](deploy/README.md). Use PostgreSQL for development and tests.

```text
backend: python manage.py test --noinput
ui:      npm run lint
ui:      npm test
ui:      npm run build
```

GitHub Actions runs those checks with a separate PostgreSQL test database.
Tests must not send real mail. Keep regression tests for permissions, transactions
and workflow transitions; disposable investigation files do not belong in source.
