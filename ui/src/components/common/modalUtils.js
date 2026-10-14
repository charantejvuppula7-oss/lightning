export function canUsePermission(user, module, action) {
  const role = String(user?.role?.name || user?.role || '').toLowerCase()
  return role === 'admin' || role === 'administrator'
    || user?.permissions?.[module]?.[action] === true
}

export function getApiError(error) {
  const data = error?.data
  if (typeof data?.detail === 'string') return data.detail
  if (typeof data === 'object' && data) return Object.entries(data).map(([field, value]) =>
    `${field}: ${Array.isArray(value) ? value.join(', ') : typeof value === 'string' ? value : JSON.stringify(value)}`,
  ).join(' ')
  return error?.message || 'Unable to save. Please try again.'
}

export function displayName(user) {
  return `${user?.first_name || user?.First_Name || ''} ${user?.last_name || user?.Last_Name || ''}`.trim()
    || user?.user_name || user?.User_Name || user?.email || 'User'
}
