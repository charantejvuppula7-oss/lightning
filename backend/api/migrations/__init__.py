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
