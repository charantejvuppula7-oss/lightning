from django.db import transaction
from rest_framework import status
from rest_framework.response import Response

from api.models import Milestone_Features
from apps.core.pagination import ResourcePagination
from apps.features.serializers import FeatureSerializer
from apps.features.filters import filter_features
from apps.core.views import ResourceAPIView


FEATURE_QUERYSET = Milestone_Features.objects.select_related('Milestone', 'Milestone__project')


class FeatureListCreateView(ResourceAPIView):
    """
    List features accessible within the user's project scope or create a new feature under a milestone.
    """
    resource = 'feature'
    queryset = FEATURE_QUERYSET

    def get(self, request):
        """
        List features with filtering, sorting, and pagination.

        Args:
            request (Request): Incoming DRF request.

        Returns:
            Response: Paginated serialized features.
        """
        queryset = filter_features(self.authorized_queryset(request), request.query_params)
        paginator = ResourcePagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(FeatureSerializer(page, many=True).data)

    def post(self, request):
        """
        Create a new feature and log an audit event.

        Args:
            request (Request): DRF request with feature payload.

        Returns:
            Response: Serialized feature with HTTP 201 Created.
        """
        serializer = FeatureSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            instance = serializer.save()
            self.audit(request, instance, 'created')
        return Response(FeatureSerializer(instance).data, status=status.HTTP_201_CREATED)


class FeatureDetailView(ResourceAPIView):
    """
    Retrieve, update, or delete an individual feature.
    """
    resource = 'feature'
    queryset = FEATURE_QUERYSET

    def get(self, request, feature_id):
        """
        Retrieve details of a single feature.

        Args:
            request (Request): Incoming request.
            feature_id (UUID): Feature identifier.

        Returns:
            Response: Serialized feature details.
        """
        instance = self.authorized_object(request, feature_id)
        return Response(FeatureSerializer(instance).data)

    def put(self, request, feature_id):
        return self._update(request, feature_id)

    def patch(self, request, feature_id):
        return self._update(request, feature_id, partial=True)

    def _update(self, request, feature_id, partial=False):
        with transaction.atomic():
            instance = self.authorized_object(request, feature_id, lock=True)
            serializer = FeatureSerializer(instance, data=request.data, partial=partial, context={'request': request})
            serializer.is_valid(raise_exception=True)
            instance = serializer.save()
            self.audit(request, instance, 'updated')
        return Response(FeatureSerializer(instance).data)

    def delete(self, request, feature_id):
        """
        Delete a feature within an atomic transaction.

        Args:
            request (Request): Incoming request.
            feature_id (UUID): Feature identifier.

        Returns:
            Response: Empty response with HTTP 204 No Content.
        """
        with transaction.atomic():
            instance = self.authorized_object(request, feature_id, lock=True)
            self.audit(request, instance, 'deleted')
            instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


