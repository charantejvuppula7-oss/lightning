from datetime import timedelta
from math import isfinite

from django.utils import timezone


def weekly_availability(project, user_ids):
    """Count planned task points against the selected project's weekday capacity."""
    import json
    from api.models import Task

    monday = timezone.localdate()
    monday -= timedelta(days=monday.weekday())
    capacity = max(project.points_per_working_day, 1)
    tasks = Task.objects.filter(project=project, assigned_to_id__in=user_ids,
        Due_Date__range=(monday, monday + timedelta(days=6))).exclude(status='completed')
    by_user = {user_id: {} for user_id in user_ids}
    for task in tasks:
        try:
            metadata = json.loads(task.Remarks or '{}')
            points = max(float(metadata.get('points', 1)), 0) if isinstance(metadata, dict) else 1
            if not isfinite(points):
                points = 1
        except (TypeError, ValueError):
            points = 1
        by_user[task.assigned_to_id].setdefault(task.Due_Date, []).append({
            'id': task.pk, 'task_name': task.Task_Name, 'status': task.status, 'points': points,
            'project_name': project.project_name,
        })
    results = {}
    for user_id in user_ids:
        days = []
        for offset in range(7):
            day = monday + timedelta(days=offset)
            day_tasks = by_user[user_id].get(day, [])
            used = sum(task['points'] for task in day_tasks)
            days.append({'date': day, 'day_name': day.strftime('%A'), 'is_weekend': offset >= 5,
                'points_used': used, 'points_capacity': capacity if offset < 5 else 0,
                'available_points': max(capacity - used, 0) if offset < 5 else 0,
                'status': 'busy' if used >= capacity else 'half_day' if used else 'free', 'tasks': day_tasks})
        weekdays = days[:5]
        results[user_id] = {'total_working_days': 5, 'weekly_capacity': 5 * capacity, 'daily_breakdown': days,
            'available_days': sum(day['status'] == 'free' for day in weekdays),
            'half_days': sum(day['status'] == 'half_day' for day in weekdays),
            'busy_days': sum(day['status'] == 'busy' for day in weekdays),
            'workload_percent': round(sum(day['points_used'] for day in weekdays) / (5 * capacity) * 100)}
    return results
