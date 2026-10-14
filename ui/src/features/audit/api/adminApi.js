import { apiRequest } from '../../../services/api/apiClient.js'

// --- API Logs ---

/**
 * Fetch paginated API request logs.
 * @param {Object} params - Query params: page, page_size, method, status, path
 */
export const getApiLogs = (params = {}) => {
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()
  return apiRequest(`/admin/logs/api/${query ? `?${query}` : ''}`)
}

// --- Audit Logs ---

/**
 * Fetch paginated audit trail logs.
 * @param {Object} params - Query params: page, page_size, action, entity_type, user
 */
export const getAuditLogs = (params = {}) => {
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()
  return apiRequest(`/admin/logs/audit/${query ? `?${query}` : ''}`)
}

// --- Database Explorer ---

/** Fetch all table names with row counts. */
export const getDbTables = () => apiRequest('/admin/db/tables/')

/**
 * Fetch schema + first 100 rows of a specific table.
 * @param {string} tableName
 */
export const getDbTableDetail = (tableName) =>
  apiRequest(`/admin/db/tables/${encodeURIComponent(tableName)}/`)
