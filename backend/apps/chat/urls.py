from django.urls import path
from apps.chat.views import ChatMembersView, ChatReactionView

from apps.chat.views import ChatHistoryView, ChatThreadView


urlpatterns = [
    path('projects/<uuid:project_id>/chat/messages/<uuid:message_id>/reaction/', ChatReactionView.as_view()),
    path('projects/<uuid:project_id>/chat/members/', ChatMembersView.as_view()),
    path('projects/<uuid:project_id>/chat/messages/', ChatHistoryView.as_view(),
         name='project-chat-history'),
    path('projects/<uuid:project_id>/chat/messages/<uuid:message_id>/thread/',
         ChatThreadView.as_view(), name='project-chat-thread'),
]
