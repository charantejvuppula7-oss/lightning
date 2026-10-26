from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Department, Role, UserData
from apps.roles.permissions import require_permission, require_role_assignment


class UserOptionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        require_permission(request.user, 'User Management', 'View')
        roles = []
        for role in Role.objects.order_by('name'):
            try:
                require_role_assignment(request.user, role)
            except PermissionDenied:
                continue
            roles.append({'id': role.pk, 'name': role.name})
        return Response({'roles': roles, 'departments': Department.ALLOWED_DEPARTMENTS,
                         'employment_types': UserData.EMPLOYMENT_CHOICES})
