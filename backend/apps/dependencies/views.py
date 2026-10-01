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
    resource = 'dependency'
    queryset = DEPENDENCY_QUERYSET

    def get(self, request):
        queryset = filter_dependencies(self.authorized_queryset(request), request.query_params)
        paginator = ResourcePagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(DependencySerializer(page, many=True).data)

    def post(self, request):
        serializer = DependencySerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            instance = serializer.save()
            self.audit(request, instance, 'created')
        return Response(DependencySerializer(instance).data, status=status.HTTP_201_CREATED)


class DependencyDetailView(ResourceAPIView):
    resource = 'dependency'
    queryset = DEPENDENCY_QUERYSET

    def get(self, request, dependency_id):
        instance = self.authorized_object(request, dependency_id)
        return Response(DependencySerializer(instance).data)

    def put(self, request, dependency_id):
        return self._update(request, dependency_id)

    def patch(self, request, dependency_id):
        return self._update(request, dependency_id, partial=True)

    def _update(self, request, dependency_id, partial=False):
        with transaction.atomic():
            instance = self.authorized_object(request, dependency_id, lock=True)
            serializer = DependencySerializer(instance, data=request.data, partial=partial,
                                              context={'request': request})
            serializer.is_valid(raise_exception=True)
            instance = serializer.save()
            self.audit(request, instance, 'updated')
        return Response(DependencySerializer(instance).data)

    def delete(self, request, dependency_id):
        with transaction.atomic():
            instance = self.authorized_object(request, dependency_id, lock=True)
            self.audit(request, instance, 'deleted')
            instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
