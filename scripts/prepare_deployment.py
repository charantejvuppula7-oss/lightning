"""Prepare the separate Ubuntu database and environment from Company's DB credentials."""

import os
from pathlib import Path
import secrets
import sys

from dotenv import dotenv_values
import psycopg
from psycopg import sql


backend = Path(__file__).resolve().parents[1] / 'backend'
env_path = backend / '.env'
config = dotenv_values(env_path) if env_path.exists() else dotenv_values(sys.argv[1])
if env_path.exists() and config.get('POSTGRES_DB') != 'lighting_v2.0':
    raise SystemExit('Existing backend/.env must target lighting_v2.0. It was not changed.')
if env_path.exists() and (
    config.get('USE_SQLITE', 'False').lower() in ('true', '1', 't')
    or config.get('POSTGRES_HOST', '127.0.0.1') not in ('127.0.0.1', 'localhost')
):
    raise SystemExit('Existing backend/.env must use the approved local PostgreSQL installation.')
for key in ('POSTGRES_USER', 'POSTGRES_PASSWORD'):
    if not config.get(key):
        raise SystemExit(f'{key} is missing from the supplied environment file.')

# PostgreSQL is installed directly on the confirmed Ubuntu host.
database = {
    'host': '127.0.0.1', 'port': config.get('POSTGRES_PORT') or '5432',
    'user': config['POSTGRES_USER'], 'password': config['POSTGRES_PASSWORD'],
}
with psycopg.connect(dbname='postgres', autocommit=True, **database) as connection:
    if not connection.execute('SELECT 1 FROM pg_database WHERE datname = %s', ('lighting_v2.0',)).fetchone():
        connection.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier('lighting_v2.0')))

if not env_path.exists():
    values = {
        'DJANGO_SETTINGS_MODULE': 'config.settings.production', 'DEBUG': 'False',
        'SECRET_KEY': secrets.token_urlsafe(64),
        'ALLOWED_HOSTS': '122.175.58.131,127.0.0.1,localhost',
        'FRONTEND_URL': 'http://122.175.58.131:5173',
        'CSRF_TRUSTED_ORIGINS': 'http://122.175.58.131:5173',
        'CORS_ALLOWED_ORIGINS': 'http://122.175.58.131:5173',
        'SESSION_COOKIE_SECURE': 'False', 'CSRF_COOKIE_SECURE': 'False', 'USE_SQLITE': 'False',
        'POSTGRES_DB': 'lighting_v2.0', 'POSTGRES_HOST': database['host'],
        'POSTGRES_PORT': database['port'], 'POSTGRES_USER': database['user'],
        'POSTGRES_PASSWORD': database['password'],
    }
    # Exclusive creation preserves existing secrets on later deployments.
    descriptor = os.open(env_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, 'w', encoding='utf-8') as destination:
        for key, value in values.items():
            escaped = str(value).replace('\\', '\\\\').replace("'", "\\'")
            destination.write(f"{key}='{escaped}'\n")
print('Database lighting_v2.0 and backend environment are ready; credentials were not printed.')
