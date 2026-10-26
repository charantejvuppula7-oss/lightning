import { apiRequest } from '../../services/api/apiClient.js'

export function saveTask({ projectId, task = {}, values }) {
  let metadata = {}
  try { metadata = JSON.parse(task.Remarks || '{}') } catch { /* Older tasks may have plain-text remarks. */ }
  const id = task.Id || task.id || task.dbId
  return apiRequest(id ? `/tasks/${id}/` : '/tasks/', { method: id ? 'PATCH' : 'POST', body: {
    project: projectId, Task_Name: values.taskName, description: values.description, Due_Date: values.dueDate,
    assigned_to: values.assignedTo, review_by: values.reviewer || null,
    sprint: values.sprint || null, feature: values.feature || null,
    Remarks: JSON.stringify({ ...metadata, priority: values.priority || 'medium', points: Number(values.points) || 0, milestone_id: values.milestone || null }),
  } })
}
