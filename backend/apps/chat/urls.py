from django.urls import path
from apps.chat.views import ChatMembersView, ChatReactionView, ChatPresenceView

from apps.chat.views import ChatHistoryView, ChatStreamView, ChatThreadView, ChatTypingView


urlpatterns = [
    path('projects/<uuid:project_id>/chat/presence/', ChatPresenceView.as_view()),
    path('projects/<uuid:project_id>/chat/messages/<uuid:message_id>/reaction/', ChatReactionView.as_view()),
    path('projects/<uuid:project_id>/chat/members/', ChatMembersView.as_view()),
    path('projects/<uuid:project_id>/chat/messages/', ChatHistoryView.as_view(),
         name='project-chat-history'),
    path('projects/<uuid:project_id>/chat/stream/', ChatStreamView.as_view(),
         name='project-chat-stream'),
    path('projects/<uuid:project_id>/chat/messages/<uuid:message_id>/thread/',
         ChatThreadView.as_view(), name='project-chat-thread'),
    path('projects/<uuid:project_id>/chat/typing/', ChatTypingView.as_view(),
         name='project-chat-typing'),
]
