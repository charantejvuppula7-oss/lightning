from django.urls import path

from apps.roles.views import RoleSchemaView, RoleListCreateView, RoleDetailView


urlpatterns = [
    path('roles/schema/', RoleSchemaView.as_view(), name='roles-schema'),
    path('roles/', RoleListCreateView.as_view(), name='roles-list'),
    path('roles/<uuid:role_id>/', RoleDetailView.as_view(), name='roles-detail'),
]
