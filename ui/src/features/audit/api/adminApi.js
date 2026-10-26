import { apiRequest } from '../../../services/api/apiClient.js'
export { apiFetch as adminFetch } from '../../../services/api/apiClient.js'
export const getLogs = (kind, params) => apiRequest(`/${kind}/?${params}`)
