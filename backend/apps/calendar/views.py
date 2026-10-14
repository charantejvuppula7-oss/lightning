"""Views for Calendar event aggregation and date-range queries."""

import uuid
from datetime import date, timedelta
from django.utils.dateparse import parse_date
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.calendar.services import CalendarService


class CalendarEventsView(APIView):
    """
    GET /api/calendar/events/
    Returns normalized calendar events (tasks, dependencies, milestones, sprints)
    intersecting the requested date range [start, end], scoped to the requesting user's accessible projects.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Handle calendar events query, validating date range and query filters.

        Args:
            request (Request): Authenticated HTTP request with query parameters:
                - 'start' (YYYY-MM-DD): Start date.
                - 'end' (YYYY-MM-DD): End date.
                - 'project_id': Target project UUID or 'all'.
                - 'type': Comma-separated event types ('task,sprint,milestone,dependency').
                - 'category': Comma-separated category filters.
                - 'status': Filter by task/item status.
                - 'assigned_to': Filter by assignee UUID.

        Returns:
            Response: JSON array of normalized event objects.
        """
        query_params = request.query_params


        # ── 1. Date Range Parsing & Validation ──
        raw_start = query_params.get("start")
        raw_end = query_params.get("end")

        start_date = None
        end_date = None

        if raw_start:
            start_date = parse_date(raw_start)
            if not start_date:
                return Response(
                    {"detail": "Invalid start date format. Expected YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if raw_end:
            end_date = parse_date(raw_end)
            if not end_date:
                return Response(
                    {"detail": "Invalid end date format. Expected YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Defaults: current month ± 15 days if range not fully provided
        today = date.today()
        if not start_date and not end_date:
            start_date = today.replace(day=1) - timedelta(days=7)
            # Approx 42 days window
            end_date = start_date + timedelta(days=42)
        elif not start_date:
            start_date = end_date - timedelta(days=42)
        elif not end_date:
            end_date = start_date + timedelta(days=42)

        if start_date > end_date:
            return Response(
                {"detail": "start date must be before or equal to end date."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (end_date - start_date).days > 185:
            return Response(
                {"detail": "Date range cannot exceed 6 months (185 days)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── 2. Project ID Scoping ──
        project_id = query_params.get("project_id") or query_params.get("projectId")
        if project_id and project_id != "all":
            try:
                uuid.UUID(str(project_id))
            except (ValueError, TypeError):
                return Response(
                    {"detail": "Invalid project_id format. Expected UUID."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # ── 3. Filters ──
        raw_types = query_params.get("types")
        types = [t.strip().lower() for t in raw_types.split(",") if t.strip()] if raw_types else None

        raw_categories = query_params.get("categories") or query_params.get("category")
        categories = [c.strip().lower() for c in raw_categories.split(",") if c.strip()] if raw_categories else None

        task_status = query_params.get("status")

        assigned_to = query_params.get("assigned_to") or query_params.get("assignedTo")
        if assigned_to:
            try:
                uuid.UUID(str(assigned_to))
            except (ValueError, TypeError):
                return Response(
                    {"detail": "Invalid assigned_to format. Expected UUID."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # ── 4. Aggregate Events via Service ──
        calendar_data = CalendarService.get_calendar_events(
            user=request.user,
            start_date=start_date,
            end_date=end_date,
            project_id=project_id,
            types=types,
            categories=categories,
            status=task_status,
            assigned_to=assigned_to,
        )

        return Response(calendar_data, status=status.HTTP_200_OK)
