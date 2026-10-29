#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXPECTED_DIR=/home/tachyon-pc-1/Documents/company/lighting_v2.0
if [[ "$REPO_DIR" != "$EXPECTED_DIR" || "$(id -un)" != tachyon-pc-1 ]]; then
    echo "Run as tachyon-pc-1 from $EXPECTED_DIR/scripts/deploy.sh."
    exit 1
fi
BACKEND_DIR="$REPO_DIR/backend"
UI_DIR="$REPO_DIR/ui"
export DJANGO_SETTINGS_MODULE=config.settings.production
unset USE_SQLITE POSTGRES_DB POSTGRES_HOST POSTGRES_PORT POSTGRES_USER POSTGRES_PASSWORD

if [[ ! -f "$BACKEND_DIR/.env" ]]; then
    COMPANY_ENV="${1:-}"
    if [[ -z "$COMPANY_ENV" || ! -f "$COMPANY_ENV" ]]; then
        echo 'First deployment: bash scripts/deploy.sh /absolute/path/to/existing/Company/.env'
        exit 1
    fi
fi

sudo -v
python3 -m venv "$BACKEND_DIR/venv"
PYTHON="$BACKEND_DIR/venv/bin/python"
"$PYTHON" -m pip install -r "$BACKEND_DIR/requirements.txt"
"$PYTHON" "$REPO_DIR/scripts/prepare_deployment.py" "${COMPANY_ENV:-}"
cd "$BACKEND_DIR"
"$PYTHON" manage.py shell -c 'import uuid; from django.core.cache import cache; key="deployment-check-"+uuid.uuid4().hex; cache.set(key, "ok", 30); assert cache.get(key)=="ok", "Redis cache check failed"; cache.delete(key); print("Redis cache check passed")'
"$PYTHON" manage.py check
"$PYTHON" manage.py migrate --noinput
"$PYTHON" manage.py collectstatic --noinput
"$PYTHON" manage.py bootstrap_admin

cd "$UI_DIR"
npm ci --no-audit
npm run build -- --outDir "$UI_DIR/dist"
sudo install -d -m 755 /var/www/lighting_v2.0
sudo cp -a "$UI_DIR/dist/." /var/www/lighting_v2.0/
sudo chmod -R a+rX /var/www/lighting_v2.0

mkdir -p "$BACKEND_DIR/media"
# Permit Nginx to traverse this user's home without exposing other home files.
for directory in /home/tachyon-pc-1 /home/tachyon-pc-1/Documents /home/tachyon-pc-1/Documents/company "$REPO_DIR" "$BACKEND_DIR"; do
    sudo setfacl -m u:www-data:--x "$directory"
done
sudo setfacl -R -m u:www-data:rX "$BACKEND_DIR/media" "$BACKEND_DIR/staticfiles"
sudo setfacl -d -m u:www-data:rX "$BACKEND_DIR/media"

sudo install -m 644 "$REPO_DIR/deploy/lighting-v2.service" /etc/systemd/system/
sudo install -m 644 "$REPO_DIR/deploy/lighting-v2-log-cleanup.service" /etc/systemd/system/
sudo install -m 644 "$REPO_DIR/deploy/lighting-v2-log-cleanup.timer" /etc/systemd/system/
for job in reminders email-outbox; do
    sudo install -m 644 "$REPO_DIR/deploy/lighting-v2-$job.service" /etc/systemd/system/
    sudo install -m 644 "$REPO_DIR/deploy/lighting-v2-$job.timer" /etc/systemd/system/
done
sudo install -m 644 "$REPO_DIR/deploy/lighting-v2.nginx.conf" /etc/nginx/sites-available/lighting-v2
sudo ln -sfn /etc/nginx/sites-available/lighting-v2 /etc/nginx/sites-enabled/lighting-v2
sudo nginx -t
NGINX_CONFIG="$(sudo nginx -T 2>&1)"
if [[ "$NGINX_CONFIG" != *'/etc/nginx/sites-enabled/lighting-v2:'* && "$NGINX_CONFIG" != *'/etc/nginx/sites-available/lighting-v2:'* ]]; then
    echo 'The existing Nginx configuration does not load the new site.'
    echo 'Add this inside its existing http {} block, then rerun deployment:'
    echo '    include /etc/nginx/sites-enabled/lighting-v2;'
    exit 1
fi
sudo systemctl daemon-reload
sudo systemctl enable lighting-v2.service lighting-v2-log-cleanup.timer lighting-v2-reminders.timer lighting-v2-email-outbox.timer
sudo systemctl restart lighting-v2.service lighting-v2-log-cleanup.timer lighting-v2-reminders.timer lighting-v2-email-outbox.timer
sudo systemctl start lighting-v2-log-cleanup.service
sudo systemctl reload nginx
curl --fail --retry 10 --retry-connrefused --retry-delay 2 http://127.0.0.1:8084/api/auth/csrf/ >/dev/null
curl --fail http://127.0.0.1:5173/ >/dev/null
echo 'Deployment ready: http://122.175.58.131:5173'
