import { apiRequest } from '../../shared/api/apiClient.js'

export function reviewDecision(row, action, reason = '') {
  return row.type === 'task'
    ? apiRequest(`/tasks/${row.id}/status/`, { method:'PATCH', body:{ status:action === 'approve' ? 'completed' : 'change_requested', ...(action === 'approve' ? {} : { description:reason.trim() }) } })
    : apiRequest(`/approvals/dependencies/${row.id}/`, { method:'PATCH', body:{ decision:action, reason } })
}
