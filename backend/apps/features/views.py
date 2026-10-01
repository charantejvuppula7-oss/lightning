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
    resource = 'feature'
    queryset = FEATURE_QUERYSET

    def get(self, request):
        queryset = filter_features(self.authorized_queryset(request), request.query_params)
        paginator = ResourcePagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(FeatureSerializer(page, many=True).data)

    def post(self, request):
        serializer = FeatureSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            instance = serializer.save()
            self.audit(request, instance, 'created')
        return Response(FeatureSerializer(instance).data, status=status.HTTP_201_CREATED)


class FeatureDetailView(ResourceAPIView):
    resource = 'feature'
    queryset = FEATURE_QUERYSET

    def get(self, request, feature_id):
        instance = self.authorized_object(request, feature_id)
        return Response(FeatureSerializer(instance).data)

    def put(self, request, feature_id):
        with transaction.atomic():
            instance = self.authorized_object(request, feature_id, lock=True)
            serializer = FeatureSerializer(instance, data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            instance = serializer.save()
            self.audit(request, instance, 'updated')
        return Response(FeatureSerializer(instance).data)

    def patch(self, request, feature_id):
        with transaction.atomic():
            instance = self.authorized_object(request, feature_id, lock=True)
            serializer = FeatureSerializer(instance, data=request.data, partial=True, context={'request': request})
            serializer.is_valid(raise_exception=True)
            instance = serializer.save()
            self.audit(request, instance, 'updated')
        return Response(FeatureSerializer(instance).data)

    def delete(self, request, feature_id):
        with transaction.atomic():
            instance = self.authorized_object(request, feature_id, lock=True)
            self.audit(request, instance, 'deleted')
            instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

