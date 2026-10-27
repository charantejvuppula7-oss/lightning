# Lightning UI

The React UI uses Django session authentication. Start Django on port 8000, then run `npm ci` and `npm run dev` here. Vite proxies `/api` to Django during development. In production, serve `/api` from the same origin or set `VITE_API_BASE_URL` before building.

Authentication uses an HttpOnly session cookie and Django CSRF token. No password or bearer token is stored in localStorage. Existing URLs and permission checks are preserved. Features and dashboards have purpose-based names, so a new role reuses the same pages through permissions rather than introducing another role folder.

Password reset uses request, verify OTP, and confirm endpoints. The one-time reset token stays in React navigation state, so refreshing the reset page starts the flow again.

## Source structure

```text
src/
  app/                Entry point, app composition, routes and route guards
  layouts/            Application shell, navigation and loading skeleton
  shared/
    ui/               Button, Input, Icon and Modal primitives
    components/       Shared search controls, DatePicker and feedback
    hooks/            Session, version and API loading hooks
    api/              One HTTP client and shared version request
    utils/            Shared formatting, error and permission helpers
  features/           Pages, components and logic grouped by business feature
    dashboard/        OverviewDashboard and WorkspaceDashboard
    projects/         Project list, overview, editor and selection context
    ...               Auth, tasks, chat, users, documents and other features
  styles/             Tailwind entry, design tokens and shared utilities
  assets/             Imported images with build-generated URLs
```

Put a component in `shared/` only when unrelated features use it. Keep domain components, hooks and API functions inside their feature. Import modules directly rather than adding forwarding barrels. Pages are lazy-loaded at route boundaries; keep their chunks separate from the login and navigation shell.

## Styling

`src/styles/tailwind.css` is the only application stylesheet entry. It imports Tailwind and feature-local `*.tailwind.css` utilities. Fixed presentation uses Tailwind classes; complex existing selectors use Tailwind `@utility` and `@apply` to retain responsive layouts, focus states, transitions and exact design values. Tokens and animations live in `@theme`. Do not add runtime style-tag injection, class-expansion helpers, or another styling dependency.

Keep inline values only where they depend on runtime data, such as chart sizes, avatar colours or portal coordinates. The standalone PDF report retains its self-contained print styles so it can be exported without the app's stylesheet or external fonts.

The existing shared session, project selection, version and notification requests remain shared. Do not add a second fetch for data already owned by these modules, or a new polling loop for app versions.

Run `npm run lint` and `npm run build` to verify the UI. Deployment can override the build directory with `npm run build -- --outDir dist`.
