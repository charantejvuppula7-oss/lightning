import os

from .base import *  # noqa: F403

DEBUG = False
SECRET_KEY = os.environ['SECRET_KEY']
ALLOWED_HOSTS = [host.strip() for host in os.environ['ALLOWED_HOSTS'].split(',') if host.strip()]
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',') if origin.strip()]
CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in os.environ.get('CSRF_TRUSTED_ORIGINS', '').split(',') if origin.strip()]
SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'True').lower() == 'true'
CSRF_COOKIE_SECURE = os.environ.get('CSRF_COOKIE_SECURE', 'True').lower() == 'true'
# Cookies are shared across ports, so keep this deployment separate from Company.
SESSION_COOKIE_NAME = 'lighting_v2_sessionid'
CSRF_COOKIE_NAME = 'lighting_v2_csrftoken'
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Use the existing local Redis service; keep Company's keys separate.
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379/0'),
        'KEY_PREFIX': 'lighting_v2',
        'OPTIONS': {'socket_connect_timeout': 2, 'socket_timeout': 2},
    },
}
# Nginx is the sole trusted proxy and appends the real client IP to X-Forwarded-For.
REST_FRAMEWORK = {**REST_FRAMEWORK, 'NUM_PROXIES': 1}  # noqa: F405
