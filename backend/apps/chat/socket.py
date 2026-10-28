"""Session-authenticated Socket.IO chat using the same services as HTTP."""
import asyncio
import importlib
import json
import logging
from contextvars import Context
from http.cookies import SimpleCookie
from uuid import UUID

import socketio
from asgiref.sync import sync_to_async
from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.http import HttpRequest
from rest_framework.exceptions import APIException, AuthenticationFailed, ValidationError
from rest_framework.throttling import SimpleRateThrottle

from apps.chat.serializers import ChatSendSerializer
from apps.chat.services import get_chat_room, save_chat_message, change_reaction, message_data
from apps.users.auth.backends import UserSessionAuthentication

logger = logging.getLogger(__name__)


def allowed_origin(origin, environ):
    scheme = environ.get('HTTP_X_FORWARDED_PROTO', environ.get('wsgi.url_scheme', 'http')).split(',')[0].strip()
    host = environ.get('HTTP_HOST', '')
    configured = settings.CSRF_TRUSTED_ORIGINS + getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
    return bool(origin) and origin in [f'{scheme}://{host}', *configured]


sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins=allowed_origin,
                         cors_credentials=True, max_http_buffer_size=65536, async_handlers=False)
# ponytail: one ASGI worker owns rooms/presence; use a shared manager before adding workers.
connections = {}
typing_tasks = {}
server_loop = None
access_task = None


def authenticated_user(cookie):
    cookies = SimpleCookie()
    try:
        cookies.load(cookie)
    except Exception:
        raise AuthenticationFailed('Please sign in again.')
    key = cookies.get(settings.SESSION_COOKIE_NAME)
    store = importlib.import_module(settings.SESSION_ENGINE).SessionStore
    request = HttpRequest()
    request.method = 'GET'
    request.session = store(session_key=key.value if key else None)
    result = UserSessionAuthentication().authenticate(request)
    if result is None:
        raise AuthenticationFailed('Please sign in again.')
    return result[0]


def access(cookie, project_id):
    user = authenticated_user(cookie)
    room = get_chat_room(UUID(str(project_id)), user, create=True)
    return user, room


class ChatRateThrottle(SimpleRateThrottle):
    def __init__(self, scope, user_id):
        self.scope = scope
        self.user_id = user_id
        super().__init__()

    def get_cache_key(self, request, view):
        return f'throttle:socket:{self.scope}:{self.user_id}'


def check_rate(scope, user_id):
    throttle = ChatRateThrottle(scope, user_id)
    if not throttle.allow_request(None, None):
        from rest_framework.exceptions import Throttled
        raise Throttled(wait=throttle.wait())


def failure(error):
    if isinstance(error, APIException):
        return {'ok': False, 'message': str(error.detail), 'status': error.status_code,
                'retry_after': getattr(error, 'wait', None)}
    if isinstance(error, (ValueError, TypeError)):
        return {'ok': False, 'message': 'Invalid chat request.', 'status': 400}
    logger.exception('chat_socket_failed')
    return {'ok': False, 'message': 'Chat action failed. Please try again.', 'status': 500}


def wire(data):
    return json.loads(json.dumps(data, cls=DjangoJSONEncoder))


async def startup():
    global server_loop, access_task
    server_loop = asyncio.get_running_loop()
    access_task = sio.start_background_task(session_watch)


async def shutdown():
    global server_loop, access_task
    tasks = list(typing_tasks.values()) + ([access_task] if access_task else [])
    for task in tasks:
        task.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)
    await sio.shutdown()
    typing_tasks.clear()
    connections.clear()
    access_task = None
    server_loop = None


def schedule(factory):
    if server_loop and server_loop.is_running():
        def start():
            task = sio.start_background_task(factory)
            def finished(result):
                if not result.cancelled() and result.exception():
                    logger.error('chat_broadcast_failed', exc_info=result.exception())
            task.add_done_callback(finished)
        server_loop.call_soon_threadsafe(start, context=Context())


async def presence(project_id):
    online = sorted({state['user_id'] for state in connections.values() if state.get('project_id') == project_id})
    await sio.emit('presence_changed', {'online_ids': online}, room=f'project:{project_id}')


async def clear_typing(sid, state):
    task = typing_tasks.pop(sid, None)
    if task:
        task.cancel()
    if state.get('project_id'):
        await sio.emit('typing_changed', {'user_id': state['user_id'], 'active': False},
                       room=f"project:{state['project_id']}")


async def refresh_access(project_id=None):
    for sid, state in list(connections.items()):
        pid = state.get('project_id')
        if not pid or (project_id and pid != project_id):
            continue
        try:
            await sync_to_async(access)(state['cookie'], pid)
        except (APIException, ValueError, TypeError):
            await clear_typing(sid, state)
            await sio.leave_room(sid, f'project:{pid}')
            state['project_id'] = None
            await sio.emit('access_revoked', {'message': 'Chat access revoked.'}, to=sid)
            await presence(pid)


async def broadcast(event, project_id, data):
    project_id = str(project_id)
    await refresh_access(project_id)
    await sio.emit(event, wire(data), room=f'project:{project_id}')


async def session_watch():
    while True:
        await asyncio.sleep(30)
        try:
            await refresh_access()
        except Exception:
            logger.exception('chat_session_check_failed')


@sio.event
async def connect(sid, environ, auth=None):
    try:
        cookie = environ.get('HTTP_COOKIE', '')
        user = await sync_to_async(authenticated_user)(cookie)
        await sync_to_async(check_rate)('stream', user.pk)
        connections[sid] = {'cookie': cookie, 'user_id': str(user.pk), 'project_id': None}
    except Exception as error:
        data = failure(error)
        raise socketio.exceptions.ConnectionRefusedError(data['message'], data)


@sio.event
async def leave_project(sid, data=None):
    state = connections.get(sid, {})
    pid = state.get('project_id')
    if pid:
        await clear_typing(sid, state)
        state['project_id'] = None
        await sio.leave_room(sid, f'project:{pid}')
        await presence(pid)
    return {'ok': True}


@sio.event
async def disconnect(sid, reason=None):
    await leave_project(sid)
    connections.pop(sid, None)


@sio.event
async def join_project(sid, data):
    try:
        if not isinstance(data, dict):
            raise ValidationError('Choose a project.')
        state = connections[sid]
        user, room = await sync_to_async(access)(state['cookie'], data.get('projectId'))
        await sync_to_async(check_rate)('presence', user.pk)
        await leave_project(sid)
        pid = str(room.project_id)
        state['project_id'] = pid
        await sio.enter_room(sid, f'project:{pid}')
        await refresh_access(pid)
        await presence(pid)
        return {'ok': True}
    except Exception as error:
        return failure(error)


def perform(cookie, project_id, event, data):
    user, room = access(cookie, project_id)
    check_rate('chat_send' if event == 'send_message' else 'write', user.pk)
    if event == 'send_message':
        serializer = ChatSendSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        message, _ = save_chat_message(user, {**serializer.validated_data, 'project_id': room.project_id})
        return {'message': message_data(message, user)}
    if not isinstance(data.get('active'), bool):
        raise ValidationError('active must be true or false.')
    message_id = UUID(str(data.get('messageId')))
    return change_reaction(user, room, message_id, add=data.get('active') is True)


async def action(sid, data, event):
    try:
        state = connections[sid]
        if not isinstance(data, dict) or not state.get('project_id') or str(data.get('projectId')) != state['project_id']:
            raise ValidationError('Join this project chat first.')
        result = await sync_to_async(perform)(state['cookie'], state['project_id'], event, data)
        return {'ok': True, **wire(result)}
    except Exception as error:
        return failure(error)


@sio.event
async def send_message(sid, data):
    return await action(sid, data, 'send_message')


@sio.event
async def reaction(sid, data):
    return await action(sid, data, 'reaction')


@sio.event
async def typing(sid, data):
    try:
        state = connections[sid]
        if not isinstance(data, dict) or not state.get('project_id') or str(data.get('projectId')) != state['project_id']:
            raise ValidationError('Join this project chat first.')
        user, _ = await sync_to_async(access)(state['cookie'], state['project_id'])
        if not isinstance(data.get('active'), bool):
            raise ValidationError('active must be true or false.')
        await sync_to_async(check_rate)('typing', user.pk)
        await refresh_access(state['project_id'])
        task = typing_tasks.pop(sid, None)
        if task:
            task.cancel()
        await sio.emit('typing_changed', {'user_id': str(user.pk), 'name': user.user_name, 'active': data['active']},
                       room=f"project:{state['project_id']}", skip_sid=sid)
        if data.get('active') is True:
            pid = state['project_id']
            async def expire():
                await asyncio.sleep(5)
                typing_tasks.pop(sid, None)
                await sio.emit('typing_changed', {'user_id': str(user.pk), 'active': False}, room=f'project:{pid}')
            typing_tasks[sid] = sio.start_background_task(expire)
        return {'ok': True}
    except Exception as error:
        return failure(error)
