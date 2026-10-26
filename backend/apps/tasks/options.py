from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import serializers

from api.models import Milestones, Milestone_Features, Sprint, UserData
from apps.roles.permissions import allowed_projects, require_permission
from apps.users.filters import filter_users


class TaskOptionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        require_permission(request.user, 'Tasks', 'View')
        project_id = serializers.UUIDField().run_validation(request.query_params.get('project'))
        project = get_object_or_404(allowed_projects(request.user), pk=project_id)
        members = filter_users(UserData.objects.filter(account_status='active'), {'project': str(project.pk)})
        return Response({
            'members': list(members.values('id', 'first_name', 'last_name', 'user_name')),
            'sprints': list(Sprint.objects.filter(project=project).values('id', 'Sprint_Name', 'Sprint_No')),
            'milestones': list(Milestones.objects.filter(project=project).values('id', 'name')),
            'features': list(Milestone_Features.objects.filter(Milestone__project=project).values('id', 'feature_name', 'Milestone_id')),
        })
