import { hasPermission } from './permissions.js'
export { errorMessage as getApiError } from '../api/apiClient.js'

export function canUsePermission(user, module, action) {
  const role = String(user?.role?.name || user?.role || '').toLowerCase()
  return role === 'admin' || role === 'administrator'
    || hasPermission(user?.permissions, module, action)
}

export function displayName(user) {
  return `${user?.first_name || user?.First_Name || ''} ${user?.last_name || user?.Last_Name || ''}`.trim()
    || user?.user_name || user?.User_Name || user?.email || 'User'
}
