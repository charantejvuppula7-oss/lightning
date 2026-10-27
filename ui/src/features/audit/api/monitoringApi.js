import { apiRequest } from '../../../shared/api/apiClient.js'
export { apiFetch as adminFetch } from '../../../shared/api/apiClient.js'
export const getLogs = (kind, params) => apiRequest(`/${kind}/?${params}`)
