"""
Django Shared/Base Settings
~~~~~~~~~~~~~~~~~~~~~~~~~~~
"""

from pathlib import Path
import os
import sys

# Configure PostgreSQL libpq and avoid Smart App Control binary blocks on Windows
if sys.platform == 'win32':
    os.environ.setdefault('PSYCOPG_IMPL', 'python')
    for pg_bin in [
        r'C:\Program Files\PostgreSQL\18\bin',
        r'C:\Program Files\PostgreSQL\17\bin',
        r'C:\Program Files\PostgreSQL\16\bin',
    ]:
        if os.path.isdir(pg_bin):
            if pg_bin not in os.environ.get('PATH', ''):
                os.environ['PATH'] = pg_bin + os.pathsep + os.environ.get('PATH', '')
            if hasattr(os, 'add_dll_directory'):
                try:
                    os.add_dll_directory(pg_bin)
                except OSError:
                    pass
            break

# Build paths inside the project like this: BASE_DIR / 'subdir'.
# config/settings/base.py -> parent.parent.parent is backend/
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Security settings
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-local-development-only')
DEBUG = os.environ.get('DEBUG', 'True').lower() in ('true', '1', 't')

# Application definition
# Admin app removed completely to disable admin URLs and pages
INSTALLED_APPS = [
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'api',
    'apps.roles',
    'apps.core',
    'apps.audit',
    'apps.users',
    'apps.projects',
    'apps.features',
    'apps.tasks',
    'apps.sprints',
    'apps.dependencies',
    'apps.milestones',
    'apps.notifications',
    'apps.chat',
    'apps.calendar',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.core.middleware.SecurityHeadersMiddleware',
    'apps.core.middleware.ApiLogMiddleware',
]

# Security Headers
X_FRAME_OPTIONS = 'DENY'

ALLOWED_HOSTS = ['*']

# CORS settings
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

import socket

def _get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # Using a dummy connect to determine the local machine's primary local IP
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

LOCAL_IP = _get_local_ip()

# CSRF settings - trust local network IP, localhost, and custom env origins
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4069',
    'http://127.0.0.1:4069',
    f'http://{LOCAL_IP}:3000',
    f'http://{LOCAL_IP}:5173',
    f'http://{LOCAL_IP}:4069',
]
if os.environ.get('CSRF_TRUSTED_ORIGINS'):
    CSRF_TRUSTED_ORIGINS.extend([o.strip() for o in os.environ['CSRF_TRUSTED_ORIGINS'].split(',') if o.strip()])

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# Database
# Connects to PostgreSQL by default; can fallback to SQLite if USE_SQLITE is true
USE_SQLITE = os.environ.get('USE_SQLITE', 'False').lower() in ('true', '1', 't')

if USE_SQLITE:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('POSTGRES_DB', 'companydb'),
            'USER': os.environ.get('POSTGRES_USER', 'postgres'),
            'PASSWORD': os.environ.get('POSTGRES_PASSWORD', 'root'),
            'HOST': os.environ.get('POSTGRES_HOST', ''),
            'PORT': os.environ.get('POSTGRES_PORT', '5433'),
            'CONN_MAX_AGE': 0,
        }
    }

# ---------------------------------------------------------------------------
# Session Configuration (Persistent 7-day session with DB backup)
# ---------------------------------------------------------------------------
SESSION_ENGINE = 'django.contrib.sessions.backends.cached_db'
SESSION_COOKIE_AGE = 86400 * 7  # 7 days
SESSION_SAVE_EVERY_REQUEST = True
SESSION_EXPIRE_AT_BROWSER_CLOSE = False
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = not DEBUG

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.users.auth.backends.UserSessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "10000/hour",
        "user": "10000/hour",
        "password_reset_request": "5/hour",
        "password_reset_verify": "20/hour",
        "password_reset_confirm": "10/hour",
    },
    "EXCEPTION_HANDLER": "apps.core.exceptions.custom_exception_handler",
}

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'api_request': {
            'format': 'level=%(levelname)s event=%(message)s request_id=%(request_id)s method=%(method)s path=%(path)s status=%(status_code)s duration_ms=%(duration_ms)s',
        },
    },
    'handlers': {
        'api_console': {
            'class': 'logging.StreamHandler',
            'formatter': 'api_request',
        },
    },
    'loggers': {
        'api.requests': {'handlers': ['api_console'], 'level': 'INFO', 'propagate': False},
    },
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files (uploads)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Max upload size: 100MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 104857600
FILE_UPLOAD_MAX_MEMORY_SIZE = 104857600

# ---------------------------------------------------------------------------
# Email & SMTP Configuration (kept as fallback / Django mail)
# ---------------------------------------------------------------------------
EMAIL_BACKEND = os.environ.get(
    'DJANGO_EMAIL_BACKEND',
    'django.core.mail.backends.smtp.EmailBackend'
)
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True').lower() in ('true', '1', 't')
EMAIL_USE_SSL = os.environ.get('EMAIL_USE_SSL', 'False').lower() in ('true', '1', 't')
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER or 'webmaster@localhost')
SERVER_EMAIL = os.environ.get('SERVER_EMAIL', DEFAULT_FROM_EMAIL)
EMAIL_TIMEOUT = int(os.environ.get('EMAIL_TIMEOUT', 10))
FRONTEND_URL = os.environ.get('FRONTEND_URL') or 'http://localhost:3000'

# ---------------------------------------------------------------------------
# Microsoft Graph API — transactional email notifications
# Credentials can be overridden per-environment via environment variables.
# ---------------------------------------------------------------------------
MICROSOFT_GRAPH_EMAIL = {
    "TENANT_ID":     os.environ.get("MS_GRAPH_TENANT_ID", ""),
    "CLIENT_ID":     os.environ.get("MS_GRAPH_CLIENT_ID", ""),
    "CLIENT_SECRET": os.environ.get("MS_GRAPH_CLIENT_SECRET", ""),
    "SENDER_UPN":    os.environ.get("MS_GRAPH_SENDER_UPN", ""),
}
