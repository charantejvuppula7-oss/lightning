from django.db import transaction
from rest_framework import status
from rest_framework.response import Response

from api.models import TaskDependency
from apps.core.pagination import ResourcePagination
from apps.core.views import ResourceAPIView
from apps.dependencies.serializers import DependencySerializer
from apps.dependencies.filters import filter_dependencies


DEPENDENCY_QUERYSET = TaskDependency.objects.select_related('task__project', 'depends_on', 'assigned_to')


class DependencyListCreateView(ResourceAPIView):
    """
    List task dependencies or link a new dependency relationship.
    """
    resource = 'dependency'
    queryset = DEPENDENCY_QUERYSET

    def get(self, request):
        """
        List dependencies with filtering, sorting, and pagination.

        Args:
            request (Request): Incoming DRF request.

        Returns:
            Response: Paginated serialized dependencies.
        """
        queryset = filter_dependencies(self.authorized_queryset(request), request.query_params)
        paginator = ResourcePagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(DependencySerializer(page, many=True).data)

    def post(self, request):
        """
        Create a new dependency link and log an audit event.

        Args:
            request (Request): DRF request with dependency payload.

        Returns:
            Response: Serialized dependency with HTTP 201 Created.
        """
        serializer = DependencySerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            instance = serializer.save()
            self.audit(request, instance, 'created')
        return Response(DependencySerializer(instance).data, status=status.HTTP_201_CREATED)


class DependencyDetailView(ResourceAPIView):
    """
    Retrieve, update, or remove a task dependency.
    """
    resource = 'dependency'
    queryset = DEPENDENCY_QUERYSET

    def get(self, request, dependency_id):
        """
        Retrieve details of a single dependency.

        Args:
            request (Request): Incoming request.
            dependency_id (UUID): Dependency identifier.

        Returns:
            Response: Serialized dependency.
        """
        instance = self.authorized_object(request, dependency_id)
        return Response(DependencySerializer(instance).data)

    def put(self, request, dependency_id):
        """Full update of a dependency."""
        return self._update(request, dependency_id)

    def patch(self, request, dependency_id):
        """Partial update of a dependency."""
        return self._update(request, dependency_id, partial=True)

    def _update(self, request, dependency_id, partial=False):
        """Internal helper executing dependency updates inside an atomic transaction."""
        with transaction.atomic():
            instance = self.authorized_object(request, dependency_id, lock=True)
            serializer = DependencySerializer(instance, data=request.data, partial=partial,
                                              context={'request': request})
            serializer.is_valid(raise_exception=True)
            instance = serializer.save()
            self.audit(request, instance, 'updated')
        return Response(DependencySerializer(instance).data)

    def delete(self, request, dependency_id):
        """
        Delete a dependency relationship.

        Args:
            request (Request): Incoming request.
            dependency_id (UUID): Dependency identifier.

        Returns:
            Response: Empty response with HTTP 204 No Content.
        """
        with transaction.atomic():
            instance = self.authorized_object(request, dependency_id, lock=True)
            self.audit(request, instance, 'deleted')
            instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

