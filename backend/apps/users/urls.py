from django.urls import path

from apps.users.auth.views import (
    CsrfView, LoginView, SessionView, LogoutView,
    PasswordResetRequestView, PasswordResetVerifyView, PasswordResetConfirmView,
)
from apps.users.views import UserListCreateView, UserDetailView, ProjectUserWorkloadView


urlpatterns = [
    path('auth/csrf/', CsrfView.as_view(), name='csrf'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/session/', SessionView.as_view(), name='session'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/password-reset/request/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('auth/password-reset/verify-otp/', PasswordResetVerifyView.as_view(), name='password-reset-verify'),
    path('auth/password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('user/password-reset/request/', PasswordResetRequestView.as_view(), name='user-password-reset-request'),
    path('user/password-reset/verify-otp/', PasswordResetVerifyView.as_view(), name='user-password-reset-verify'),
    path('user/password-reset/confirm/', PasswordResetConfirmView.as_view(), name='user-password-reset-confirm'),
    path('users/', UserListCreateView.as_view(), name='users-list'),
    path('users/<uuid:user_id>/', UserDetailView.as_view(), name='users-detail'),
    path('projects/<uuid:project_id>/users/workload/', ProjectUserWorkloadView.as_view(),
         name='project-user-workload'),
]
