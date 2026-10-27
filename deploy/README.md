# Ubuntu 26.04 deployment

Approved configuration:

| Setting | Value |
| --- | --- |
| User | `tachyon-pc-1` |
| Project | `/home/tachyon-pc-1/Documents/company/lighting_v2.0` |
| Website | `http://122.175.58.131:5173` |
| Backend | `127.0.0.1:8084` (not a public port) |
| PostgreSQL | Existing host installation, new database `lighting_v2.0` |
| Initial application login | `admin` / `admin` |
| Log retention | Seven days; cleanup every 24 hours |

This follows Company's native deployment: build React, migrate Django, restart
the API through systemd, validate and reload Nginx. The `lighting-v2` services,
Nginx site, database and cookie names are separate from Company. No existing
Company service or database is replaced.

## First deployment

Copy the project source, including `backend`, `ui`, `deploy` and `scripts`, into
the approved project directory. Do **not** copy the Windows `venv`, `node_modules`,
development `backend/.env`, QA data, database dumps or local logs. This creates a
fresh database; it does not import Company data.

Run as `tachyon-pc-1`:

```bash
cd /home/tachyon-pc-1/Documents/company/lighting_v2.0
sudo apt update
sudo apt install -y python3 python3-venv python3-dev build-essential libpq-dev nginx acl curl
python3 --version
node --version
npm --version
```

Django 6 requires Python 3.12 or later. The frontend requires Node 20.19+ or
22.12+ (use a supported LTS release). Install Node if absent before proceeding.
PostgreSQL should already be running. Ensure ports 5173 and 8084 are not occupied
by another service; stop any previous Vite instance on 5173 before deploying.

Redis must also be running locally on the approved `127.0.0.1:6379` endpoint:

```bash
sudo apt install -y redis-server redis-tools
sudo systemctl enable --now redis-server
redis-cli -h 127.0.0.1 -p 6379 ping
```

The expected reply is `PONG`. Reuse the existing Redis installation when present;
do not change its configuration or flush it. Do not expose 6379 through the router
or firewall. Production Django uses its native RedisCache backend with the fixed
`lighting_v2` key prefix. `REDIS_URL` in `backend/.env` can specify authentication
if required; its default is `redis://127.0.0.1:6379/0`. Redis logical database 0
may be shared with Company because keys are prefixed; a logical database is not
an authorization boundary.

Redis is used only by existing cache consumers:

- Login sessions use Django's existing `cached_db` engine: writes remain in
  PostgreSQL, and Redis accelerates session retrieval. Cache loss does not erase
  stored sessions; Django can reload them from PostgreSQL.
- DRF's existing API/password-reset throttles share counters through Redis.
- The existing application-version endpoint caches its result for 60 seconds.

Project/task data and permission results are not cached. Chat keeps its current
stream implementation. No Celery, pub/sub layer or additional Redis service is
introduced. Redis is an operational dependency for throttling and version reads;
unavailability may cause API failures. Fix the service rather than silently
disabling rate limits. Deployment tests a uniquely named cache key and deletes
only that key; it never calls FLUSHDB, FLUSHALL or Django cache.clear().

For an existing installation, pull the updated source and rerun
`bash scripts/deploy.sh`. The local Redis URL is the default, so the existing
`backend/.env` does not need to change. After deployment verify:

```bash
cd /home/tachyon-pc-1/Documents/company/lighting_v2.0
DJANGO_SETTINGS_MODULE=config.settings.production backend/venv/bin/python backend/manage.py shell -c 'from django.core.cache import caches; c=caches["default"]; print(type(c).__name__, c.key_prefix)'
REDIS_TEST_URL=redis://127.0.0.1:6379/0 backend/venv/bin/python backend/manage.py test apps.core.tests.LiveRedisTests --settings=config.settings
```

The first command should print `RedisCache lighting_v2`. The isolated live test
uses a uniquely named, 30-second test key and removes it afterwards. It does not
change PostgreSQL data or clear Company cache keys. For authenticated Redis,
supply the configured URL privately rather than copying a password into shared logs.

```bash
sudo ss -ltnp | grep -E ':(5173|8084)\b' || true
```

Find the **existing Company's environment file** on this server. Supply its
absolute path as the first argument below; replace the placeholder, not its
contents. It must contain `POSTGRES_USER` and `POSTGRES_PASSWORD`; the existing
`POSTGRES_PORT` is reused, or PostgreSQL's standard 5432 is used when absent.
No database password is written into the deployment script or printed.

```bash
bash scripts/deploy.sh /absolute/path/to/existing/Company/.env
```

The script creates `lighting_v2.0` through the existing PostgreSQL login. That
login needs permission to create databases. It generates a separate Django
secret and a private `backend/.env`, runs migrations, creates the initial admin
only if absent, builds the frontend and installs the services. An existing
environment must already target `lighting_v2.0`, otherwise deployment stops.
It never drops a database or resets an existing admin password.

Company's checked-in custom Nginx configuration does not include `sites-enabled`.
If this is also the active server configuration, the script stops with an
instruction to add `include /etc/nginx/sites-enabled/lighting-v2;` **inside its
existing `http {}` block**, then rerun deployment. Use `sudo nginx -T` to locate
the active configuration and `sudoedit` to add that line. Do not replace the
global Nginx configuration or duplicate the include if the standard
`include /etc/nginx/sites-enabled/*;` is already present. The script checks
whether the new site is actually loaded before restarting the new services.

The bootstrap account has an unroutable email `admin@localhost.invalid`, and no
onboarding email is sent. Change its email and password after the first login.
`admin` / `admin` and HTTP are the explicitly requested initial configuration;
HTTP sends credentials without transport encryption.

If UFW or an external router/firewall restricts inbound access, allow/forward
**TCP 5173** to this Ubuntu host. Do not expose 8084 or PostgreSQL. With active
UFW the rule is `sudo ufw allow 5173/tcp`; do not enable or reset a firewall
without checking existing Company and SSH rules.

## Verify and update

```bash
sudo systemctl status lighting-v2 --no-pager
curl -I http://127.0.0.1:5173/
curl http://127.0.0.1:8084/api/auth/csrf/
sudo systemctl list-timers lighting-v2-log-cleanup.timer
sudo journalctl -u lighting-v2 -n 50 --no-pager
```

Open `http://122.175.58.131:5173` and log in with the initial credentials.
Chat and notification streams use unbuffered ASGI proxying. Nginx serves the
built React assets, not Vite's development server. Existing project media URLs
are served through `/media/`; document downloads retain their API permission
checks.

After copying an update into the same folder, run:

```bash
cd /home/tachyon-pc-1/Documents/company/lighting_v2.0
bash scripts/deploy.sh
```

The timer runs daily at midnight in the Ubuntu server's timezone, with catch-up
after downtime. Deployment also runs cleanup immediately, including previously
expired logs. View results with
`sudo journalctl -u lighting-v2-log-cleanup --no-pager`.

Microsoft Graph mail configuration is optional and is **not** copied from
Company automatically. To enable mail, add the `MS_GRAPH_*` values from
`backend/.env.example` to the new `backend/.env`, then restart `lighting-v2`.

## HTTPS later

Keep HTTP until a certificate and HTTPS listener are configured. For HTTPS:

1. Confirm a domain or IP certificate and the public HTTPS port.
2. Obtain a certificate with Certbot. HTTP-01 validation requires inbound port
   80; it cannot validate through 5173. Preserve the existing Company's port-80
   configuration and add only the required ACME challenge route.
3. Configure this Nginx site with the certificate and chosen HTTPS listener.
4. Change `FRONTEND_URL`, `CSRF_TRUSTED_ORIGINS` and `CORS_ALLOWED_ORIGINS` to the
   exact HTTPS origin; update `ALLOWED_HOSTS` if adding a domain.
5. Set `SESSION_COOKIE_SECURE=True` and `CSRF_COOKIE_SECURE=True` in `backend/.env`.
6. Enable automatic certificate renewal with an Nginx reload after renewal;
   run `sudo nginx -t`, reload Nginx, and restart `lighting-v2`.

IP certificates require short-lived certificate support and reliable automatic
renewal. See [Certbot's IP certificate instructions](https://www.eff.org/deeplinks/2026/03/certbot-and-lets-encrypt-now-support-ip-address-certificates)
and [Let's Encrypt validation requirements](https://letsencrypt.org/docs/challenge-types/).
