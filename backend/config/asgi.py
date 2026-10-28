"""ASGI application for REST, notifications, and Socket.IO project chat."""

import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

django_asgi_app = get_asgi_application()

import socketio
from apps.chat.socket import sio, startup, shutdown

application = socketio.ASGIApp(sio, django_asgi_app, socketio_path='api/socket.io',
                             on_startup=startup, on_shutdown=shutdown)
