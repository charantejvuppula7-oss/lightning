"""
API Request Logging Middleware
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Records every request to ``/api/`` endpoints.
Static-asset and health-check paths are excluded to avoid noise.
"""

import time
import logging
import uuid

logger = logging.getLogger(__name__)
request_logger = logging.getLogger('api.requests')


class ApiLogMiddleware:
    """
    Django middleware that logs API requests.
    Only requests whose path starts with ``/api/`` are recorded.
    Logging failures are caught silently so they never break a real request/response cycle.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.request_id = str(uuid.uuid4())
        if not request.path.startswith('/api/'):
            return self.get_response(request)

        start_time = time.monotonic()
        response = self.get_response(request)
        response['X-Request-ID'] = request.request_id
        elapsed_ms = (time.monotonic() - start_time) * 1000.0

        try:
            self._save_log(request, response, elapsed_ms)
        except Exception:
            logger.exception('api_request_log_failed request_id=%s', request.request_id)

        request_logger.info('api_request', extra={
            'request_id': request.request_id,
            'method': request.method,
            'path': request.path,
            'status_code': response.status_code,
            'duration_ms': round(elapsed_ms, 2),
        })

        return response

    @staticmethod
    def _get_client_ip(request):
        """Extract client IP, respecting X-Forwarded-For."""
        forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        if forwarded:
            return forwarded.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '')

    @staticmethod
    def _save_log(request, response, elapsed_ms):
        """Persist one API request log; the caller handles logging failures."""
        from api.models import ApiRequestLog
        user = getattr(request, 'user', None)
        if user and not user.is_authenticated:
            user = None

        body_size = int(request.META.get('CONTENT_LENGTH') or 0)

        ApiRequestLog.objects.create(
            request_id=request.request_id,
            user=user,
            method=request.method,
            path=request.path,
            status_code=response.status_code,
            response_time_ms=round(elapsed_ms, 2),
            ip_address=ApiLogMiddleware._get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
            # Query strings can contain reset tokens or other credentials.
            query_params='',
            request_body_size=body_size,
        )


"""
Security Headers Middleware
~~~~~~~~~~~~~~~~~~~~~~~~~~~

Adds production-level HTTP security response headers to every API response.

Headers applied:
    Content-Security-Policy  — restricts resource loading (API-safe defaults)
    X-Frame-Options          — prevents clickjacking by blocking iframe embedding
    X-Content-Type-Options   — prevents MIME-type sniffing attacks
    Referrer-Policy          — controls referrer information in cross-origin requests
    Permissions-Policy       — disables access to sensitive browser APIs
"""


class SecurityHeadersMiddleware:
    """
    Django middleware that injects security headers into every HTTP response.

    Designed for a pure REST API backend (no HTML pages served), so the
    CSP policy is locked down to the strictest reasonable defaults:
    ``default-src 'none'`` plus ``frame-ancestors 'none'`` to reinforce
    the X-Frame-Options header.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        self._apply_security_headers(response)
        return response

    @staticmethod
    def _apply_security_headers(response):
        """Attach security headers to the response object."""

        # Content-Security-Policy
        response['Content-Security-Policy'] = (
            "default-src 'none'; "
            "frame-ancestors 'none'; "
            "form-action 'none';"
        )

        # Prevent iframe embedding
        response['X-Frame-Options'] = 'DENY'

        # Prevent browsers from MIME-sniffing
        response['X-Content-Type-Options'] = 'nosniff'

        # Referrer Policy
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'

        # Disable access to sensitive browser APIs
        response['Permissions-Policy'] = (
            'geolocation=(), '
            'camera=(), '
            'microphone=(), '
            'payment=(), '
            'usb=()'
        )

