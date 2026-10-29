import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout } from '../features/auth/api/authApi.js'
import { hasPermission } from '../shared/utils/permissions.js'
import useAppVersion from '../shared/hooks/useAppVersion.js'
import lightningLogoLight from '../assets/lightning-logo-light.png'
import lightningIcon from '../assets/lightning-icon.png'
import { notificationService } from '../features/notifications/notificationService.js'
import { useProjectSelection } from '../features/projects/useProjectSelection.js'
import { readSidebarCollapsed, sidebarStorageKey } from './sidebarState.js'

// Navigation behavior is colocated with the sidebar so role access stays easy to review.
/* eslint-disable react-refresh/only-export-components */

const ROLE_PREFIXES = { admin: 'admin', pm: 'pm', user: 'user' }
const BASE_ROUTE_ALIASES = new Set(['/admin', '/pm', '/dashboard'])

export const hasSidebarPermission = hasPermission

export function sidebarItems(role, permissions = {}) {
  const roleItems = role === 'admin' ? ADMIN_MENU_ITEMS : role === 'pm' ? PM_MENU_ITEMS : USER_MENU_ITEMS
  return roleItems.filter(item => (
    role === 'admin' || !item.permission || hasSidebarPermission(permissions, item.permission)
  ))
}

export function sidebarItemActive(item, pathname, role) {
  if (pathname === item.path || pathname.startsWith(`${item.path}/`)) return true

  const rolePrefix = ROLE_PREFIXES[role] || 'user'
  const aliases = {
    '/projects': rolePrefix === 'admin' ? '/admin/all-projects' : `/${rolePrefix}/projects`,
    '/tasks': `/${rolePrefix}/tasks`,
    '/dependencies': `/${rolePrefix}/dependencies`,
    '/chat': `/${rolePrefix}/chat`,
    '/calendar': `/${rolePrefix}/calendar`,
    '/admin/db-explorer': '/admin/database',
    '/admin': '/admin/dashboard',
    '/pm': '/pm/dashboard',
    '/dashboard': '/user/dashboard',
  }

  return Object.entries(aliases).some(([alias, target]) => {
    if (target !== item.path) return false
    if (pathname === alias) return true
    return !BASE_ROUTE_ALIASES.has(alias) && pathname.startsWith(`${alias}/`)
  })
}

// Admin side elements access
const ADMIN_MENU_ITEMS = [
  { icon: 'space_dashboard', label: 'Overview', path: '/admin/dashboard' },
  { icon: 'folder_open', label: 'Projects', path: '/admin/all-projects', permission: 'Projects' },
  { icon: 'assignment_turned_in', label: 'Tasks', path: '/admin/tasks', permission: 'Tasks' },
  { icon: 'account_tree', label: 'Dependencies', path: '/admin/dependencies', permission: 'Dependencies' },
  { icon: 'chat', label: 'Project Chat', path: '/admin/chat', permission: 'Chat' },
  { icon: 'fact_check', label: 'Approvals', path: '/admin/approvals' },
  { icon: 'monitoring', label: 'Workload', path: '/admin/workload', permission: 'TeamWorLoad' },
  { icon: 'description', label: 'Documents', path: '/admin/documents', permission: 'Documents' },
  { icon: 'group', label: 'Users', path: '/admin/users', permission: 'User Management' },
  { icon: 'admin_panel_settings', label: 'Roles & Permissions', path: '/admin/roles-permissions', permission: 'Roles & permissions' },
  { icon: 'database', label: 'Database Explorer', path: '/admin/database' },
  { icon: 'history', label: 'Audit Logs', path: '/admin/audit-logs' },
  { icon: 'speed', label: 'API Logs', path: '/admin/api-logs' },
  { icon: 'calendar_today', label: 'Calendar', path: '/admin/calendar' },
]

// PM side elements access
const PM_MENU_ITEMS = [
  { icon: 'space_dashboard', label: 'Dashboard', path: '/pm/dashboard' },
  { icon: 'folder_open', label: 'Projects', path: '/pm/projects', permission: 'Projects' },
  { icon: 'assignment_turned_in', label: 'Tasks', path: '/pm/tasks', permission: 'Tasks' },
  { icon: 'account_tree', label: 'Dependencies', path: '/pm/dependencies', permission: 'Dependencies' },
  { icon: 'group', label: 'Users', path: '/pm/users', permission: 'User Management' },
  { icon: 'chat', label: 'Chat', path: '/pm/chat', permission: 'Chat' },
  { icon: 'fact_check', label: 'Approvals', path: '/pm/approvals' },
  { icon: 'monitoring', label: 'Workload', path: '/pm/workload', permission: 'TeamWorLoad' },
  { icon: 'admin_panel_settings', label: 'Roles & Permission', path: '/pm/roles-permissions', permission: 'Roles & permissions' },
  { icon: 'calendar_today', label: 'Calendar', path: '/pm/calendar' },
  { icon: 'description', label: 'Document', path: '/pm/documents', permission: 'Documents' },
  { icon: 'history', label: 'Audit logs', path: '/pm/audit-logs' },
]

// User side elements access
const USER_MENU_ITEMS = [
  { id: 'workspace', label: 'Dashboard', path: '/user/dashboard', icon: 'dashboard', permission: 'Dashboard' },
  { id: 'tasks', label: 'Tasks', path: '/user/tasks', icon: 'tasks', permission: 'Tasks' },
  { id: 'projects', label: 'Projects', path: '/user/projects', icon: 'folder_open', permission: 'Projects' },
  { id: 'dependencies', label: 'Dependencies', path: '/user/dependencies', icon: 'dependencies', permission: 'Dependencies' },
  { id: 'chats', label: 'Chats', path: '/user/chat', icon: 'chat', permission: 'Chat' },
  { id: 'approvals', label: 'Approvals', path: '/user/approvals', icon: 'fact_check', permission: 'Approvals' },
  { id: 'calendar', label: 'Calendar', path: '/user/calendar', icon: 'calendar' },
  { id: 'documents', label: 'Document', path: '/user/documents', icon: 'document', permission: 'Documents' },
  { id: 'users', label: 'Users', path: '/user/users', icon: 'group', permission: 'User Management' },
  { id: 'roles-permissions', label: 'Roles & Permissions', path: '/user/roles-permissions', icon: 'admin_panel_settings', permission: 'Roles & permissions' },
  { id: 'workload', label: 'Workload', path: '/user/workload', icon: 'monitoring', permission: 'TeamWorLoad' },
]

const materialIcons = {
  dashboard: 'space_dashboard',
  projects: 'folder_open',
  tasks: 'assignment_turned_in',
  dependencies: 'account_tree',
  users: 'group',
  chat: 'chat',
  approvals: 'fact_check',
  workload: 'monitoring',
  roles: 'admin_panel_settings',
  calendar: 'calendar_today',
  document: 'description',
  audit: 'history',
  database: 'database',
}

function SidebarIcon({ name }) {
  return <span className="material-symbols-outlined sidebar-icon" aria-hidden="true">
    {materialIcons[name] || name}
  </span>
}

export default function Sidebar({ active: currentPath, effectiveRole: role = 'user', permissions = {}, canAccessChat = false, onLogout, isCollapsed: controlledCollapsed, onToggle }) {
  const navigate = useNavigate()
  const effectiveRole = ['admin', 'pm'].includes(role) ? role : 'user'
  const [internalCollapsed, setInternalCollapsed] = useState(() => readSidebarCollapsed(effectiveRole))
  const isCollapsed = controlledCollapsed ?? internalCollapsed
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const version = useAppVersion()
  const isLoadingVersion = false
  const menuItems = sidebarItems(effectiveRole, permissions, canAccessChat)
  const { selectedProjectId } = useProjectSelection()
  const [projectCounts, setProjectCounts] = useState({})
  useEffect(() => {
    let active = true
    const update = page => { if (active) setProjectCounts(page.sidebar_counts || {}) }
    const unsubscribe = notificationService.subscribe(update)
    notificationService.getSnapshot().then(update).catch(() => {})
    return () => { active = false; unsubscribe() }
  }, [])
  const counts = selectedProjectId && selectedProjectId !== 'all'
    ? projectCounts[selectedProjectId] || {}
    : Object.values(projectCounts).reduce((total, project) => {
      for (const [key, count] of Object.entries(project)) total[key] = (total[key] || 0) + count
      return total
    }, {})
  const handleToggle = () => {
    if (onToggle) return onToggle()
    setInternalCollapsed(previous => {
      localStorage.setItem(sidebarStorageKey, String(!previous))
      return !previous
    })
  }
  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    setLogoutError('')
    try {
      if (onLogout) await onLogout()
      else await logout()
      for (const key of ['pm_current_user', 'user_session']) {
        localStorage.removeItem(key)
        sessionStorage.removeItem(key)
      }
      navigate('/login', { replace: true })
    } catch {
      setLogoutError('Unable to sign out. Please try again.')
      setLoggingOut(false)
    }
  }
  const sidebarWidth = isCollapsed ? "68px" : "220px";
  const sidebarPadding = isCollapsed ? "20px 8px" : "20px 16px";
  const sidebarStyle = {
    width: sidebarWidth,
    minWidth: sidebarWidth,
    maxWidth: sidebarWidth,
    height: '100dvh',
    minHeight: '100dvh',
    maxHeight: '100dvh',
    padding: sidebarPadding,
    boxSizing: 'border-box',
    flexShrink: 0,
    fontFamily: 'Inter, sans-serif',
    fontSize: '13px',
    lineHeight: 1.5,
  };

  return (
    <div
      className={`app-sidebar ${effectiveRole}-sidebar` + " " + "[transition:width_0.25s_cubic-bezier(0.4,_0,_0.2,_1),_padding_0.25s_ease]! [background:var(--color-white)]! [border-right:1px_solid_var(--color-slate-200)]! flex! flex-col! shrink-0! box-border! h-dvh! max-h-[100dvh]! min-h-0! sticky! top-[0]! [align-self:flex-start]! overflow-hidden! z-[50]! [font-family:'Inter',_sans-serif]!"}
      style={sidebarStyle}
    >

      {/* Top Header: Logo + Toggle Button */}
      <div
        className="flex! items-center! h-[40px]! p-[0_2px]! w-full! box-border! shrink-0!" style={{
  justifyContent: isCollapsed ? "center" : "space-between",
  marginBottom: "16px"
}}
      >
        <div
          className="flex! items-center! gap-[8px]! overflow-hidden! no-underline!"
        >
          {isCollapsed ? (
            <img
              src={lightningIcon}
              alt="Lightning PDPM"
              className="object-contain! block! shrink-0!" style={{
  width: "20px",
  height: "20px",
  borderRadius: "6px"
}}
            />
          ) : (
            <>
              <img
                src={lightningLogoLight}
                alt="Lightning PDPM"
                className="w-auto! object-contain! block! [flex-shrink:1]!" style={{
  height: "30px",
  maxWidth: "150px"
}}
              />
              {(version || isLoadingVersion) && (
                <span
                  aria-label={version ? `Version ${version}` : "Loading version"}
                  title={version ? `Version ${version}` : "Loading version"}
                  className="shrink-0! text-[9px]! leading-[1]! font-semibold! [color:var(--color-slate-500)]! whitespace-nowrap!"
                >
                  {version ? `v${version}` : "v..."}
                </span>
              )}
            </>
          )}
        </div>

        <button
          type="button"
          onClick={handleToggle}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!isCollapsed}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          className="[background:none]! border-0! cursor-pointer! flex! items-center! justify-center! [color:var(--color-slate-500)]! p-[4px]! rounded-[6px]! [transition:all_0.15s_ease]! shrink-0!" style={{
  marginRight: isCollapsed ? 0 : "-6px"
}}
        >
          <span className={"material-symbols-outlined" + " " + "text-[18px]!"} >
            {isCollapsed ? "chevron_right" : "chevron_left"}
          </span>
        </button>
      </div>

      {/* Navigation Menu (Scrollable between Logo and Logout) */}
      <div
        className={"shared-sidebar-scrollable" + " " + "flex! flex-col! gap-[4px]! [flex:1_1_0%]! min-h-0! overflow-y-auto! overflow-x-hidden! [overscroll-behavior:contain]!"}
        style={{
  paddingRight: isCollapsed ? "0px" : "4px"
}}
      >
        {effectiveRole === "admin" && !isCollapsed && (
          <div
            className="text-[10px]! font-bold! [color:var(--color-slate-400)]! [text-transform:uppercase]! tracking-[0.08em]! p-[4px_10px_8px_10px]!"
          >
            Administration
          </div>
        )}

        {menuItems.map((item) => {
          const active = sidebarItemActive(item, currentPath, effectiveRole);
          const itemKey = item.id || item.label;

          return (
            <div
              key={itemKey}
              className={`shared-sidebar-nav-btn ${active ? "active" : ""}` + " " + "flex! items-center! gap-[12px]! rounded-[8px]! cursor-pointer! [transition:all_0.15s_ease]! select-none!"}
              role="link" tabIndex={0} aria-label={item.label} aria-current={active ? "page" : undefined}
              onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); navigate(item.path); } }}
              title={isCollapsed ? item.label : ""}
              style={{
  padding: isCollapsed ? "10px 0" : "10px 12px",
  lineHeight: "20px",
  fontFamily: "inherit",
  justifyContent: isCollapsed ? "center" : "flex-start",
  fontSize: "13px",
  fontWeight: active ? "600" : "500",
  color: active ? "var(--color-primary)" : "var(--color-slate-600)",
  backgroundColor: active ? "var(--color-primary-subtle)" : "transparent"
}}
              onClick={() => navigate(item.path)}
            >
              <SidebarIcon name={item.icon} />
              {!isCollapsed && (
                <>
                  <span className="whitespace-nowrap! overflow-hidden! text-ellipsis! flex-1!">
                    {item.label}
                  </span>
                  {counts[item.permission || item.label] > 0 && <span aria-label={`${counts[item.permission || item.label]} pending ${item.label}`} className="inline-flex h-[20px] min-w-[20px] shrink-0 items-center justify-center rounded-full bg-[#fef2f2] px-[5px] text-[11px] font-semibold text-red-600">{counts[item.permission || item.label]}</span>}
                </>
              )}
            </div>
          );
        })}
      </div>

      {logoutError && <div role="alert">{logoutError}</div>}
      {/* Logout button (Pinned at Bottom) */}
      <div
        className="mt-auto! [flex:0_0_auto]! sticky! bottom-[0]! z-[1]! pb-[max(8px,_env(safe-area-inset-bottom))]! [border-top:1px_solid_var(--color-slate-100)]! w-full! [background-color:var(--color-white)]!" style={{
  paddingTop: "14px"
}}
      >
        <button
          type="button"
          className={"shared-sidebar-logout-btn-red" + " " + "flex! items-center! font-semibold! cursor-pointer! [transition:all_0.15s_ease]! select-none! w-full! border-0! [font-family:inherit]! text-left!"}
          title={isCollapsed ? "Sign Out" : ""}
          aria-label="Sign Out"
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
  gap: "12px",
  padding: isCollapsed ? "10px 0" : "10px 12px",
  justifyContent: isCollapsed ? "center" : "flex-start",
  borderRadius: "8px",
  fontSize: "13px",
  color: "var(--color-danger-dark)",
  backgroundColor: "var(--color-danger-bg)"
}}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: "18px",
              color: "var(--color-danger-dark)",
            }}
            aria-hidden="true"
          >
            logout
          </span>
          {!isCollapsed && "Sign Out"}
        </button>
      </div>
    </div>
  );
}
