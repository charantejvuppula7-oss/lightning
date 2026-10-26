const ADMIN_MENU_ITEMS = [
  { icon: "space_dashboard", label: "Overview", path: "/admin/dashboard" },
  { icon: "folder_open", label: "All Projects & PMs", path: "/admin/all-projects", permission: "Projects" },
  { icon: "assignment_turned_in", label: "Tasks", path: "/admin/tasks", permission: "Tasks" },
  { icon: "account_tree", label: "Dependencies", path: "/admin/dependencies", permission: "Dependencies" },
  { icon: "chat", label: "Project Chat", path: "/admin/chat", permission: "Chat" },
  { icon: "fact_check", label: "Approvals", path: "/admin/approvals" },
  { icon: "monitoring", label: "Workload", path: "/admin/workload", permission: "TeamWorLoad" },
  { icon: "description", label: "Documents", path: "/admin/documents", permission: "Documents" },
  { icon: "group", label: "Users & Accounts", path: "/admin/users", permission: "User Management" },
  { icon: "admin_panel_settings", label: "Roles & Permissions", path: "/admin/roles-permissions", permission: "Roles & permissions" },
  { icon: "database", label: "Database Explorer", path: "/admin/database" },
  { icon: "history", label: "Audit Logs", path: "/admin/audit-logs" },
  { icon: "speed", label: "API Logs", path: "/admin/api-logs" },
];

const PM_MENU_ITEMS = [
  { icon: "space_dashboard", label: "Dashboard", path: "/pm/dashboard" },
  { icon: "folder_open", label: "Projects", path: "/pm/projects", permission: "Projects" },
  { icon: "assignment_turned_in", label: "Tasks", path: "/pm/tasks", permission: "Tasks" },
  { icon: "account_tree", label: "Dependencies", path: "/pm/dependencies", permission: "Dependencies" },
  { icon: "group", label: "Users", path: "/pm/users", permission: "User Management" },
  { icon: "chat", label: "Chat", path: "/pm/chat", permission: "Chat" },
  { icon: "fact_check", label: "Approvals", path: "/pm/approvals" },
  { icon: "monitoring", label: "Workload", path: "/pm/workload", permission: "TeamWorLoad" },
  { icon: "admin_panel_settings", label: "Roles & Permission", path: "/pm/roles-permissions", permission: "Roles & permissions" },
  { icon: "calendar_today", label: "Calendar", path: "/pm/calendar", permission: "Milestones" },
  { icon: "description", label: "Document", path: "/pm/documents", permission: "Documents" },
  { icon: "history", label: "Audit logs", path: "/pm/audit-logs" },
];

const USER_MENU_ITEMS = [
  { id: "workspace", label: "Dashboard", path: "/user/dashboard", icon: "dashboard", permission: "Dashboard" },
  { id: "tasks", label: "Tasks", path: "/user/tasks", icon: "tasks", },
  { id: "projects", label: "Projects", path: "/user/projects", icon: "folder_open", permission: "Projects" },
  { id: "dependencies", label: "Dependencies", path: "/user/dependencies", icon: "dependencies", },
  { id: "chats", label: "Chats", path: "/user/chat", icon: "chat", permission: "Chat" },
  { id: "approvals", label: "Approvals", path: "/user/approvals", icon: "fact_check", permission: "Approvals" },
  { id: "calendar", label: "Calendar", path: "/user/calendar", icon: "calendar" },
  { id: "documents", label: "Document", path: "/user/documents", icon: "document" },
  { id: "audit-logs", label: "Audit Logs", path: "/user/audit-logs", icon: "history", permission: "Audit Logs" },
  { id: "users", label: "Users", path: "/user/users", icon: "group", permission: "User Management" },
  { id: "roles-permissions", label: "Roles & Permissions", path: "/user/roles-permissions", icon: "admin_panel_settings", permission: "Roles & permissions" },
  { id: "workload", label: "Workload", path: "/user/workload", icon: "monitoring", permission: "TeamWorLoad" },
];


export function hasSidebarPermission(permissions, module, action = 'View') {
  if (module === 'Approvals') return ['Tasks','Dependencies'].some(name => hasSidebarPermission(permissions,name,action))
  const normalize = value => value.trim().toLowerCase().replace(/[\s_&]/g, '').replace('teamworload', 'teamworkload')
  const key = Object.keys(permissions).find(key => normalize(key) === normalize(module))
  const actions = permissions[key] || {}
  const actionKey = Object.keys(actions).find(key => key.toLowerCase() === action.toLowerCase())
  if (actionKey !== undefined) return Boolean(actions[actionKey])
  return module === 'Dashboard' && action === 'View'
}

export function sidebarItems(role, permissions = {}, canAccessChat = false) {
  const items = role === 'admin' ? ADMIN_MENU_ITEMS : role === 'pm' ? PM_MENU_ITEMS : USER_MENU_ITEMS
  return items.filter(item => role === 'admin' || !item.permission || (item.permission === 'Chat' && (canAccessChat || hasSidebarPermission(permissions, 'Projects'))) || hasSidebarPermission(permissions, item.permission))
}

export function sidebarItemActive(item, pathname, role) {
  if (pathname === item.path || pathname.startsWith(item.path + '/')) return true
  const aliases = {
    '/projects': role === 'admin' ? '/admin/all-projects' : `/${role === 'pm' ? 'pm' : 'user'}/projects`,
    '/tasks': `/${role === 'admin' ? 'admin' : role === 'pm' ? 'pm' : 'user'}/tasks`,
    '/dependencies': `/${role === 'admin' ? 'admin' : role === 'pm' ? 'pm' : 'user'}/dependencies`,
    '/chat': `/${role === 'admin' ? 'admin' : role === 'pm' ? 'pm' : 'user'}/chat`,
    '/calendar': `/${role === 'pm' ? 'pm' : 'user'}/calendar`,
    '/admin/db-explorer': '/admin/database',
    '/admin': '/admin/dashboard', '/pm': '/pm/dashboard', '/dashboard': '/user/dashboard',
  }
  return Object.entries(aliases).some(([from, to]) => to === item.path && (pathname === from || pathname.startsWith(from + '/') && !['/admin', '/pm', '/dashboard'].includes(from)))
}
