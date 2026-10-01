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
    resource = 'milestone'
    queryset = MILESTONE_QUERYSET

    def get(self, request):
        queryset = filter_milestones(self.authorized_queryset(request), request.query_params)
        paginator = ResourcePagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(MilestoneSerializer(page, many=True).data)

    def post(self, request):
        serializer = MilestoneSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            instance = serializer.save(created_by=request.user, updated_by=request.user)
            self.audit(request, instance, 'created')
        return Response(MilestoneSerializer(instance).data, status=status.HTTP_201_CREATED)


class MilestoneDetailView(ResourceAPIView):
    resource = 'milestone'
    queryset = MILESTONE_QUERYSET

    def get(self, request, milestone_id):
        instance = self.authorized_object(request, milestone_id)
        return Response(MilestoneSerializer(instance).data)

    def put(self, request, milestone_id):
        with transaction.atomic():
            instance = self.authorized_object(request, milestone_id, lock=True)
            serializer = MilestoneSerializer(instance, data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            instance = serializer.save(updated_by=request.user)
            self.audit(request, instance, 'updated')
        return Response(MilestoneSerializer(instance).data)

    def patch(self, request, milestone_id):
        with transaction.atomic():
            instance = self.authorized_object(request, milestone_id, lock=True)
            serializer = MilestoneSerializer(instance, data=request.data, partial=True, context={'request': request})
            serializer.is_valid(raise_exception=True)
            instance = serializer.save(updated_by=request.user)
            self.audit(request, instance, 'updated')
        return Response(MilestoneSerializer(instance).data)

    def delete(self, request, milestone_id):
        with transaction.atomic():
            instance = self.authorized_object(request, milestone_id, lock=True)
            instance.validate_deletion()
            self.audit(request, instance, 'deleted')
            instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

