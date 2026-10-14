# Lightning UI

The React UI uses the existing Django session authentication API. Start Django on port 8000, then run `npm ci` and `npm run dev` here. Vite proxies `/api` to Django during development. In production, serve `/api` from the same origin or set `VITE_API_BASE_URL` to the backend API root before building.

Authentication uses an HttpOnly session cookie and Django CSRF token. The browser sends cookies on every API request; no password or bearer token is stored in local storage. Login accepts a username or email, then routes Administrator, Project Manager, and other roles to their respective dashboard paths. The current dashboard routes are minimal placeholders because this Vite checkout contains no dashboard feature pages yet.

Password reset uses request, verify OTP, and confirm endpoints. The one-time reset token stays in React navigation state, so refreshing the reset page starts the flow again.

Run `npm test`, `npm run lint`, and `npm run build` to verify the UI.
