"""Per-endpoint limits, shared through Django's configured cache (Redis in production)."""
from collections.abc import Mapping

from django.utils.crypto import salted_hmac
from rest_framework.settings import api_settings
from rest_framework.throttling import SimpleRateThrottle


ENDPOINT_SCOPES = {
    'LoginView': 'login', 'CsrfView': 'session', 'SessionView': 'session',
    'LogoutView': 'session', 'AppVersionView': 'version', 'GlobalSearchView': 'search',
    'ChatStreamView': 'stream', 'NotificationStreamView': 'stream',
    'ChatTypingView': 'typing', 'ChatPresenceView': 'presence',
    'TaskStatusView': 'task_status', 'DashboardOverviewView': 'analytics',
    'WorkspaceView': 'analytics', 'ProjectOverviewView': 'analytics',
    'ProjectUserWorkloadView': 'analytics', 'CalendarEventsView': 'analytics',
    'DbTablesView': 'monitoring', 'DbTableDetailView': 'monitoring',
    'DbRecordView': 'monitoring', 'ApiLogsView': 'monitoring', 'AuditLogsView': 'monitoring',
    'DocumentDownloadView': 'download',
}


class EndpointRateThrottle(SimpleRateThrottle):
    scope = 'read'

    def allow_request(self, request, view):
        scope = 'read' if request.method in ('GET', 'HEAD', 'OPTIONS') else 'write'
        if view.__class__.__name__ == 'ChatHistoryView':
            scope = 'read' if request.method == 'GET' else 'chat_send'
        elif request.method in ('POST', 'PUT', 'PATCH') and request.content_type.startswith('multipart/'):
            scope = 'upload'
        self.scope = getattr(view, 'throttle_scope', None) or ENDPOINT_SCOPES.get(view.__class__.__name__, scope)
        self.rate = api_settings.DEFAULT_THROTTLE_RATES[self.scope]
        self.num_requests, self.duration = self.parse_rate(self.rate)
        return super().allow_request(request, view)

    def get_cache_key(self, request, view):
        identity = f'user:{request.user.pk}' if request.user.is_authenticated else f'ip:{self.get_ident(request)}'
        method = 'GET' if request.method == 'HEAD' else request.method
        endpoint = f'{view.__class__.__module__}.{view.__class__.__name__}:{method}'
        return f'throttle:{self.scope}:{endpoint}:{identity}'


class LoginIdentifierThrottle(SimpleRateThrottle):
    scope = 'login_identifier'

    def get_rate(self):
        return api_settings.DEFAULT_THROTTLE_RATES[self.scope]

    def get_cache_key(self, request, view):
        data = request.data
        if not isinstance(data, Mapping):
            return None
        identifier = data.get('identifier') or data.get('User_Name') or ''
        if not identifier:
            return None
        digest = salted_hmac('login-throttle', str(identifier).strip().lower()).hexdigest()
        return f'throttle:{self.scope}:{digest}'
