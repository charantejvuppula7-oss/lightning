"""Service layer for aggregating and normalizing calendar events across tasks, dependencies, milestones, and sprints."""

from datetime import date
from django.db.models import Q
from rest_framework.exceptions import PermissionDenied

from api.models import Task, TaskDependency, Milestones, Sprint
from apps.roles.permissions import allowed_projects, scope_queryset


class CalendarService:
    """
    Service layer responsible for aggregating, filtering, and normalizing calendar events
    across multiple underlying domain entities (Tasks, TaskDependencies, Milestones, Sprints).
    """
    @staticmethod
    def get_calendar_events(
        user,
        start_date: date = None,
        end_date: date = None,
        project_id=None,
        types=None,
        categories=None,
        status=None,
        assigned_to=None,
    ):
        """
        Aggregate and normalize calendar events intersecting the date range [start_date, end_date].

        Strictly scopes results to projects authorized for the requesting user according to RBAC.
        Transforms tasks, dependencies, milestones, and sprints into uniform event structures:
        { id, title, type, category, start, end, allDay, status, projectId, projectName, ... }

        Args:
            user (UserData): The requesting authenticated user.
            start_date (date|None): Beginning of the viewing window.
            end_date (date|None): End of the viewing window.
            project_id (str|UUID|None): Filter by a specific project ID, or None/"all".
            types (list[str]|None): Event types to include ('task', 'dependency', 'milestone', 'sprint').
            categories (list[str]|None): Optional category filters.
            status (str|None): Filter by item status.
            assigned_to (str|UUID|None): Filter by assigned user ID.

        Returns:
            list[dict]: Array of normalized calendar event dictionaries.

        Raises:
            PermissionDenied: If project_id is outside the user's allowed projects.
        """

        if project_id and project_id != "all":
            if not allowed_projects(user).filter(pk=project_id).exists():
                raise PermissionDenied("Project outside your scope or not found.")

        included_types = set(types) if types else {"task", "dependency", "milestone", "sprint"}
        included_categories = set(categories) if categories else None

        events = []

        # ── 1. Tasks ──
        if "task" in included_types:
            task_qs = (
                scope_queryset(user, "task", Task.objects.all())
                .select_related("project", "assigned_to")
                .prefetch_related("dependencies")
            )
            if project_id and project_id != "all":
                task_qs = task_qs.filter(project_id=project_id)
            if assigned_to:
                task_qs = task_qs.filter(assigned_to_id=assigned_to)
            if status:
                task_qs = task_qs.filter(status=status)
            if start_date and end_date:
                task_qs = task_qs.filter(
                    Q(Due_Date__range=(start_date, end_date))
                    | Q(start_Time__date__range=(start_date, end_date))
                    | Q(
                        Due_Date__isnull=True,
                        start_Time__isnull=True,
                        created_at__date__range=(start_date, end_date),
                    )
                )

            for task in task_qs:
                task_date = (
                    task.Due_Date
                    or (task.start_Time.date() if task.start_Time else None)
                    or task.created_at.date()
                )
                date_key = task_date.isoformat()

                if task.start_Time:
                    time_str = task.start_Time.strftime("%I:%M %p")
                elif task.Due_Date:
                    time_str = f"Due {task.Due_Date.strftime('%m-%d')}"
                else:
                    time_str = "09:00 AM"

                is_blocked = task.status == "blocked"
                has_deps = bool(task.dependencies.all())
                category = "blockers" if is_blocked else ("dependencies" if has_deps else "tasks")

                if included_categories and category not in included_categories:
                    continue

                assignee_name = ""
                if task.assigned_to:
                    full_name = f"{task.assigned_to.first_name} {task.assigned_to.last_name}".strip()
                    assignee_name = full_name or task.assigned_to.user_name

                events.append({
                    "id": f"task-{task.id}",
                    "source_id": str(task.id),
                    "type": "task",
                    "category": category,
                    "title": task.Task_Name or (task.description[:35] if task.description else "Task"),
                    "fullTitle": task.Task_Name or "Task",
                    "dateKey": date_key,
                    "date": date_key,
                    "time": time_str,
                    "status": task.status,
                    "priority": getattr(task, "priority", "medium"),
                    "project": task.project.project_name if task.project else "",
                    "projectId": str(task.project_id) if task.project_id else None,
                    "assignedTo": assignee_name,
                    "description": task.description or "",
                    "is_blocked": is_blocked,
                })

        # ── 2. Dependencies ──
        if "dependency" in included_types:
            dep_qs = (
                scope_queryset(user, "dependency", TaskDependency.objects.all())
                .select_related("task", "task__project", "assigned_to")
            )
            if project_id and project_id != "all":
                dep_qs = dep_qs.filter(task__project_id=project_id)
            if assigned_to:
                dep_qs = dep_qs.filter(assigned_to_id=assigned_to)
            if status:
                dep_qs = dep_qs.filter(status=status)
            if start_date and end_date:
                dep_qs = dep_qs.filter(
                    Q(due_date__range=(start_date, end_date))
                    | Q(start_Time__date__range=(start_date, end_date))
                    | Q(
                        due_date__isnull=True,
                        start_Time__isnull=True,
                        created_at__date__range=(start_date, end_date),
                    )
                )

            for dep in dep_qs:
                dep_date = (
                    dep.due_date
                    or (dep.start_Time.date() if dep.start_Time else None)
                    or dep.created_at.date()
                )
                date_key = dep_date.isoformat()

                if dep.start_Time:
                    time_str = dep.start_Time.strftime("%I:%M %p")
                elif dep.due_date:
                    time_str = f"Due {dep.due_date.strftime('%m-%d')}"
                else:
                    time_str = "10:00 AM"

                is_blocked = dep.status == "blocked"
                category = "blockers" if is_blocked else "dependencies"

                if included_categories and category not in included_categories:
                    continue

                assignee_name = ""
                if dep.assigned_to:
                    full_name = f"{dep.assigned_to.first_name} {dep.assigned_to.last_name}".strip()
                    assignee_name = full_name or dep.assigned_to.user_name

                project_name = ""
                project_id_str = None
                if dep.task and dep.task.project:
                    project_name = dep.task.project.project_name
                    project_id_str = str(dep.task.project_id)

                events.append({
                    "id": f"dep-{dep.id}",
                    "source_id": str(dep.id),
                    "type": "dependency",
                    "category": category,
                    "title": dep.description[:35] if dep.description else "Dependency",
                    "fullTitle": dep.description or "Task Dependency",
                    "dateKey": date_key,
                    "date": date_key,
                    "time": time_str,
                    "status": dep.status,
                    "priority": "medium",
                    "project": project_name,
                    "projectId": project_id_str,
                    "assignedTo": assignee_name,
                    "description": dep.description or "",
                    "is_blocked": is_blocked,
                })

        # ── 3. Milestones ──
        if "milestone" in included_types:
            milestone_qs = (
                scope_queryset(user, "milestone", Milestones.objects.all())
                .select_related("project", "created_by")
            )
            if project_id and project_id != "all":
                milestone_qs = milestone_qs.filter(project_id=project_id)
            if start_date and end_date:
                milestone_qs = milestone_qs.filter(due_date__range=(start_date, end_date))

            for milestone in milestone_qs:
                date_key = milestone.due_date.isoformat()
                category = "tasks"

                if included_categories and category not in included_categories:
                    continue

                creator_name = ""
                if milestone.created_by:
                    full_name = f"{milestone.created_by.first_name} {milestone.created_by.last_name}".strip()
                    creator_name = full_name or milestone.created_by.user_name

                events.append({
                    "id": f"milestone-{milestone.id}",
                    "source_id": str(milestone.id),
                    "type": "milestone",
                    "category": category,
                    "title": milestone.name or "Milestone",
                    "fullTitle": milestone.name,
                    "dateKey": date_key,
                    "date": date_key,
                    "time": f"Due {milestone.due_date.strftime('%m-%d')}",
                    "status": "milestone",
                    "priority": "high",
                    "project": milestone.project.project_name if milestone.project else "",
                    "projectId": str(milestone.project_id) if milestone.project_id else None,
                    "assignedTo": creator_name,
                    "description": milestone.description or "",
                    "is_blocked": False,
                })

        # ── 4. Sprints ──
        if "sprint" in included_types:
            sprint_qs = (
                scope_queryset(user, "sprint", Sprint.objects.all())
                .select_related("project")
            )
            if project_id and project_id != "all":
                sprint_qs = sprint_qs.filter(project_id=project_id)
            if status:
                sprint_qs = sprint_qs.filter(Status=status)
            if start_date and end_date:
                sprint_qs = sprint_qs.filter(
                    Sprint_start_date__lte=end_date,
                    Sprint_end_date__gte=start_date,
                )

            for sprint in sprint_qs:
                date_key = sprint.Sprint_start_date.isoformat()
                category = "tasks"

                if included_categories and category not in included_categories:
                    continue

                events.append({
                    "id": f"sprint-{sprint.id}",
                    "source_id": str(sprint.id),
                    "type": "sprint",
                    "category": category,
                    "title": sprint.Sprint_Name or sprint.Sprint_No or "Sprint",
                    "fullTitle": f"{sprint.Sprint_No}: {sprint.Sprint_Name}" if sprint.Sprint_No and sprint.Sprint_Name else (sprint.Sprint_Name or sprint.Sprint_No or "Sprint"),
                    "dateKey": date_key,
                    "date": date_key,
                    "time": f"{sprint.Sprint_start_date.strftime('%m-%d')} to {sprint.Sprint_end_date.strftime('%m-%d')}",
                    "status": sprint.Status,
                    "priority": "medium",
                    "project": sprint.project.project_name if sprint.project else "",
                    "projectId": str(sprint.project_id) if sprint.project_id else None,
                    "assignedTo": "",
                    "description": f"Sprint duration: {sprint.Number_of_days} working days.",
                    "is_blocked": False,
                })

        # Sort chronologically by dateKey, then time, then title
        events.sort(key=lambda x: (x.get("dateKey") or "", x.get("time") or "", x.get("title") or ""))

        return {
            "start": start_date.isoformat() if start_date else None,
            "end": end_date.isoformat() if end_date else None,
            "count": len(events),
            "events": events,
        }
