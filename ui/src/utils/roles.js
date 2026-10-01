export function roleSlug(role) {
  const name = String(role || '').trim().toLowerCase().replace(/[_-]/g, ' ')
  if (name === 'administrator' || name === 'admin') return 'admin'
  if (name === 'project manager' || name === 'pm') return 'pm'
  if (['developer', 'dev', 'user', 'employee'].includes(name)) return 'developer'
  return name.replace(/[^a-z0-9]+/g, '-')
}

export function getRoleDashboard(role) {
  const slug = roleSlug(role)
  if (slug === 'admin') return '/admin/dashboard'
  if (slug === 'pm') return '/pm/dashboard'
  return '/user/dashboard'
}
