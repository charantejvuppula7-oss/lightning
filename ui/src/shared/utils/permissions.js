const actions = ['View', 'Create', 'Edit', 'Delete']
export const permissionSchema = Object.fromEntries([
  ...['Tasks', 'Features', 'Milestones', 'Reports', 'Projects', 'Documents', 'Dependencies',
    'User Management', 'Roles & permissions', 'Department Managment'].map(module => [module, actions]),
  ...['TeamWorLoad', 'ProjectJourney', 'ProjectPerformanceGraph', 'MilestoneMap', 'TeamStatus',
    'recentActvities'].map(module => [module, ['View']]),
])

const normalize = value => String(value).trim().toLowerCase().replace(/[\s_&]/g, '').replace('teamworload', 'teamworkload')

export function hasPermission(permissions, module, action = 'View') {
  const canonical = Object.keys(permissionSchema).find(name => normalize(name) === normalize(module))
  if (!canonical) return true
  const label = permissionSchema[canonical].find(name => name.toLowerCase() === String(action).toLowerCase())
  if (!label) return false
  const key = Object.keys(permissions || {}).find(name => normalize(name) === normalize(canonical))
  const values = permissions?.[key]
  const actionKey = Object.keys(values || {}).find(name => name.toLowerCase() === label.toLowerCase())
  return values?.[actionKey] === true
}
