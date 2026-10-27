import { apiRequest } from '../../shared/api/apiClient.js';

export async function fetchCalendarEvents({
  start,
  end,
  projectId,
  categories,
  types,
  status,
  assignedTo,
} = {}) {
  const params = new URLSearchParams();
  if (start) params.append('start', start);
  if (end) params.append('end', end);
  if (projectId && projectId !== 'all') params.append('project_id', projectId);
  if (categories && categories.length > 0) params.append('categories', categories.join(','));
  if (types && types.length > 0) params.append('types', types.join(','));
  if (status) params.append('status', status);
  if (assignedTo) params.append('assigned_to', assignedTo);

  const query = params.toString();
  const url = query ? `/calendar/events/?${query}` : '/calendar/events/';
  return apiRequest(url);
}
