from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response

from api.models import Sprint
from apps.core.pagination import ResourcePagination
from apps.core.views import ResourceAPIView
from apps.sprints.serializers import SprintSerializer, SprintBulkSerializer
from apps.sprints.filters import filter_sprints
from apps.sprints.services import create_sprints
from apps.roles.permissions import allowed_projects


SPRINT_QUERYSET = Sprint.objects.select_related('project').prefetch_related('team_members')


class SprintListCreateView(ResourceAPIView):
    """
    List sprints or create a single sprint within a project.
    """
    resource = 'sprint'
    queryset = SPRINT_QUERYSET

    def get(self, request):
        """
        List sprints with filtering, sorting, and pagination.

        Args:
            request (Request): Incoming DRF request.

        Returns:
            Response: Paginated serialized sprints.
        """
        queryset = filter_sprints(self.authorized_queryset(request), request.query_params)
        paginator = ResourcePagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(SprintSerializer(page, many=True).data)

    def post(self, request):
        """
        Create a new sprint and record an audit log event.

        Args:
            request (Request): DRF request with sprint payload.

        Returns:
            Response: Serialized created sprint with HTTP 201 Created.
        """
        serializer = SprintSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            instance = serializer.save()
            self.audit(request, instance, 'created')
        return Response(SprintSerializer(instance).data, status=status.HTTP_201_CREATED)


class SprintDetailView(ResourceAPIView):
    """
    Retrieve, update, or delete a single sprint.
    """
    resource = 'sprint'
    queryset = SPRINT_QUERYSET

    def get(self, request, sprint_id):
        """
        Retrieve details of a sprint by ID.

        Args:
            request (Request): Incoming request.
            sprint_id (UUID): Sprint identifier.

        Returns:
            Response: Serialized sprint details.
        """
        instance = self.authorized_object(request, sprint_id)
        return Response(SprintSerializer(instance).data)

    def put(self, request, sprint_id):
        """Full update of a sprint."""
        return self._update(request, sprint_id)

    def patch(self, request, sprint_id):
        """Partial update of a sprint."""
        return self._update(request, sprint_id, partial=True)

    def _update(self, request, sprint_id, partial=False):
        """Internal helper executing sprint mutations within an atomic transaction."""
        with transaction.atomic():
            instance = self.authorized_object(request, sprint_id, lock=True)
            serializer = SprintSerializer(instance, data=request.data, partial=partial,
                                          context={'request': request})
            serializer.is_valid(raise_exception=True)
            instance = serializer.save()
            self.audit(request, instance, 'updated')
        return Response(SprintSerializer(instance).data)

    def delete(self, request, sprint_id):
        """
        Delete a sprint within an atomic transaction.

        Args:
            request (Request): Incoming request.
            sprint_id (UUID): Sprint identifier.

        Returns:
            Response: Empty response with HTTP 204 No Content.
        """
        with transaction.atomic():
            instance = self.authorized_object(request, sprint_id, lock=True)
            self.audit(request, instance, 'deleted')
            instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SprintBulkCreateView(ResourceAPIView):
    """
    Bulk sprint generation endpoint creating multiple consecutive sprints for a project.
    """
    resource = 'sprint'
    audit_entity = 'sprint'

    def post(self, request, project_id):
        """
        Create multiple sprints in a single transaction.

        Args:
            request (Request): Payload with 'sprints' list.
            project_id (UUID): Target project identifier.

        Returns:
            Response: List of created sprint summaries with HTTP 201 Created.
        """
        project = get_object_or_404(allowed_projects(request.user), pk=project_id)
        serializer = SprintBulkSerializer(data=request.data, context={'project': project})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data['sprints']
        with transaction.atomic():
            prepared, _ = create_sprints(project, data)
            self.audit(request, project, 'bulk_created', new_values={'count': len(prepared)})
        return Response([
            {'id': sprint.pk, 'client_id': client_id, 'Sprint_Name': sprint.Sprint_Name,
             'Sprint_start_date': sprint.Sprint_start_date,
             'Sprint_end_date': sprint.Sprint_end_date}
            for sprint, client_id in prepared
        ], status=status.HTTP_201_CREATED)

