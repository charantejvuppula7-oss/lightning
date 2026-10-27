"""
Custom Exception Handler
~~~~~~~~~~~~~~~~~~~~~~~~

Overrides DRF's default exception handler to return user-friendly
error responses, particularly for throttled (rate-limited) requests.
"""

import logging
from math import ceil

from rest_framework.views import exception_handler
from rest_framework.exceptions import Throttled
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError as ModelValidationError
from django.db import IntegrityError
from rest_framework.exceptions import PermissionDenied, NotAuthenticated, ValidationError
from apps.audit.services import LogService


logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Global custom exception handler for Django REST Framework.

    Handles and normalizes various exception types:
      - Django `ModelValidationError`: Converted to DRF `ValidationError` for uniform JSON errors.
      - Django `IntegrityError`: Captured, logged as a warning, and mapped to HTTP 409 Conflict.
      - DRF `PermissionDenied` and `NotAuthenticated`: Recorded as security audit events.
      - DRF `Throttled`: Formatted with user-friendly retry-after messages and HTTP 429.
      - Unhandled Exceptions: Masked to prevent leaking database internals or sensitive stack traces,
        logged with correlation ID, and returned as HTTP 500 Internal Server Error.

    Args:
        exc (Exception): The unhandled exception raised within a view.
        context (dict): Additional context dictionary containing the active DRF `request` and `view`.

    Returns:
        Response: A structured DRF Response object containing error details and status code.
    """
    request = context.get('request')
    request_id = getattr(request, 'request_id', None)
    if isinstance(exc, ModelValidationError):
        exc = ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else exc.messages)
    if isinstance(exc, IntegrityError):
        LogService.log_warning('database_conflict', request_id=request_id, error_type=type(exc).__name__)
        return Response({'detail': 'Operation conflicts with existing records.'}, status=status.HTTP_409_CONFLICT)
    response = exception_handler(exc, context)
    if isinstance(exc, (PermissionDenied, NotAuthenticated)):
        actor = getattr(request, 'user', None)
        LogService.log_security_event('access_denied', request_id=request_id,
                                      actor_id=str(actor.pk) if actor and actor.is_authenticated else None)

    if isinstance(exc, Throttled):
        wait_seconds = max(1, ceil(exc.wait or 1))

        if wait_seconds >= 60:
            wait_display = f"{wait_seconds // 60} minute(s)"
        else:
            wait_display = f"{wait_seconds} second(s)"

        return Response(
            {
                "message": "Rate limit exceeded. You have made too many requests.",
                "retry_after": wait_seconds,
                "retry_after_display": wait_display,
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS,
            headers={'Retry-After': str(wait_seconds)},
        )

    if response is None:
        # Exception messages can contain SQL values. Log safe metadata only.
        logger.error('unhandled_exception request_id=%s error_type=%s',
                     request_id, type(exc).__name__, exc_info=(type(exc), exc, exc.__traceback__))
        return Response({'detail': 'Internal server error.', 'request_id': request_id}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return response

