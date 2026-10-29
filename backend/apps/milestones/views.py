from django.db import transaction
from rest_framework import status
from rest_framework.response import Response

from api.models import Milestones
from apps.core.pagination import ResourcePagination
from apps.milestones.serializers import MilestoneSerializer
from apps.milestones.filters import filter_milestones
from apps.core.views import ResourceAPIView


MILESTONE_QUERYSET = Milestones.objects.select_related('project', 'task')


class MilestoneListCreateView(ResourceAPIView):
    """
    List milestones accessible to the user or create a new project milestone.
    """
    resource = 'milestone'
    queryset = MILESTONE_QUERYSET

    def get(self, request):
        """
        List milestones with filtering, sorting, and pagination.

        Args:
            request (Request): Incoming DRF request.

        Returns:
            Response: Paginated serialized milestones.
        """
        queryset = filter_milestones(self.authorized_queryset(request), request.query_params)
        paginator = ResourcePagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(MilestoneSerializer(page, many=True).data)

    def post(self, request):
        """
        Create a new milestone and log an audit event.

        Args:
            request (Request): DRF request with milestone payload.

        Returns:
            Response: Serialized milestone with HTTP 201 Created.
        """
        serializer = MilestoneSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            instance = serializer.save(created_by=request.user, updated_by=request.user)
            self.audit(request, instance, 'created')
        return Response(MilestoneSerializer(instance).data, status=status.HTTP_201_CREATED)


class MilestoneDetailView(ResourceAPIView):
    """
    Retrieve, update, or delete a single milestone.
    """
    resource = 'milestone'
    queryset = MILESTONE_QUERYSET

    def get(self, request, milestone_id):
        """
        Retrieve details of a single milestone by ID.

        Args:
            request (Request): Incoming request.
            milestone_id (UUID): Milestone identifier.

        Returns:
            Response: Serialized milestone.
        """
        instance = self.authorized_object(request, milestone_id)
        return Response(MilestoneSerializer(instance).data)

    def put(self, request, milestone_id):
        return self._update(request, milestone_id)

    def patch(self, request, milestone_id):
        return self._update(request, milestone_id, partial=True)

    def _update(self, request, milestone_id, partial=False):
        with transaction.atomic():
            instance = self.authorized_object(request, milestone_id, lock=True)
            serializer = MilestoneSerializer(instance, data=request.data, partial=partial, context={'request': request})
            serializer.is_valid(raise_exception=True)
            instance = serializer.save(updated_by=request.user)
            self.audit(request, instance, 'updated')
        return Response(MilestoneSerializer(instance).data)

    def delete(self, request, milestone_id):
        """
        Delete a milestone after validating deletion safety rules.

        Args:
            request (Request): Incoming request.
            milestone_id (UUID): Milestone identifier.

        Returns:
            Response: Empty response with HTTP 204 No Content.
        """
        with transaction.atomic():
            instance = self.authorized_object(request, milestone_id, lock=True)
            instance.validate_deletion()
            self.audit(request, instance, 'deleted')
            instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


