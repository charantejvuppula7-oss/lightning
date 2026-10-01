"""Small ASGI event stream used by notifications and project chat."""

import asyncio
import json
import logging
from time import monotonic
from uuid import UUID

from asgiref.sync import sync_to_async
from django.core.serializers.json import DjangoJSONEncoder
from django.db.models import Q
from django.http import StreamingHttpResponse
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError


logger = logging.getLogger(__name__)


def event_cursor(queryset, last_id):
    if not last_id:
        return timezone.now(), UUID(int=0)
    try:
        identifier = UUID(last_id)
    except (TypeError, ValueError):
        raise ValidationError({'Last-Event-ID': 'Invalid event ID.'})
    event = queryset.filter(pk=identifier).values('pk', 'created_at').first()
    if event is None:
        raise ValidationError({'Last-Event-ID': 'Event not found.'})
    return event['created_at'], event['pk']


def after_cursor(queryset, cursor):
    created_at, identifier = cursor
    return queryset.filter(Q(created_at__gt=created_at) |
                           Q(created_at=created_at, pk__gt=identifier)).order_by(
                               'created_at', 'pk')


def stream_response(fetch, cursor, event_name, presence_fetch=None):
    """Fetch committed rows in batches; clients resume with Last-Event-ID."""
    async def events():
        nonlocal cursor
        last_heartbeat = monotonic()
        previous_presence = None
        yield b': connected\n\n'
        while True:
            try:
                rows = await sync_to_async(fetch, thread_sensitive=True)(cursor)
            except PermissionDenied:
                yield b'event: access_revoked\ndata: {}\n\n'
                return
            except Exception:
                logger.exception('sse_stream_failed')
                yield b'event: stream_error\ndata: {}\n\n'
                return
            for event_id, created_at, payload in rows:
                cursor = (created_at, event_id)
                body = json.dumps(payload, cls=DjangoJSONEncoder, separators=(',', ':'))
                yield f'id: {event_id}\nevent: {event_name}\ndata: {body}\n\n'.encode()
            if presence_fetch is not None:
                presence = await sync_to_async(presence_fetch, thread_sensitive=True)()
                if presence != previous_presence:
                    body = json.dumps({'users': presence}, cls=DjangoJSONEncoder, separators=(',', ':'))
                    yield f'event: typing_changed\ndata: {body}\n\n'.encode()
                    previous_presence = presence
            if monotonic() - last_heartbeat >= 15:
                yield b': keepalive\n\n'
                last_heartbeat = monotonic()
            await asyncio.sleep(2)

    response = StreamingHttpResponse(events(), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response
