import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { logout } from '../features/auth/api/authApi.js'
import { getRoleDashboard } from '../utils/roles.js'
import logo from '../assets/lightning-logo-light.png'
import icon from '../assets/lightning-icon.png'

const iconPaths = {
  dashboard: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M9 12h12" /></>,
  projects: <><path d="M3 7h7l2 2h9l-2 11H3z" /><path d="M3 7V5h7l2 2" /></>,
  tasks: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4.5V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1.5M8.5 9h7M8.5 13h7M8.5 17H13" /></>,
  dependencies: <><rect x="2.5" y="9.5" width="5" height="5" rx=".75" /><path d="M7.5 12H13M13 5.5v13m0-13h3.5M13 12h3.5M13 18.5h3.5" /><rect x="16.5" y="3" width="5" height="5" rx=".75" /><rect x="16.5" y="9.5" width="5" height="5" rx=".75" /><rect x="16.5" y="16" width="5" height="5" rx=".75" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1zM16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v1" /></>,
  chat: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM8 8h8M8 12h5" />,
  approvals: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="m7 9 1.5 1.5L11 8m2 1h4m-10 5 1.5 1.5L11 13m2 1h4" /></>,
  workload: <><path d="M4 20v-5m5 5V9m5 11V4m5 16v-9" /><path d="m3 11 6-5 4 2 7-6" /></>,
  roles: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z" /><circle cx="12" cy="10" r="2" /><path d="M9 16a3 3 0 0 1 6 0" /></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  document: <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h6" />,
  audit: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5m4-1v5l4 2" /></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>,
}

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

function SidebarIcon({ name, role }) {
  const useCustomIcon = role === 'user'
    && ['dashboard', 'tasks', 'dependencies', 'chat', 'calendar', 'document'].includes(name)

  if (!useCustomIcon) {
    return (
      <span className="material-symbols-outlined sidebar-icon" aria-hidden="true">
        {materialIcons[name]}
      </span>
    )
  }

  return (
    <svg
      className="sidebar-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconPaths[name]}
    </svg>
  )
}

export default function Sidebar({ active, effectiveRole = 'user', onLogout }) {
  const navigate = useNavigate()
  const storageKey = `${effectiveRole}-sidebar-collapsed`
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(storageKey) === 'true')
  const [selected, setSelected] = useState(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const dashboardPath = getRoleDashboard(effectiveRole)
  const links = getSidebarElements(effectiveRole)

  const signOut = async () => {
    if (onLogout) {
      await onLogout()
      return
    }
    if (loggingOut) return
    setLoggingOut(true)
    setLogoutError('')
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch {
      setLogoutError('Unable to log out. Please try again.')
      setLoggingOut(false)
    }
  }
  const toggleCollapsed = () => {
    setCollapsed((value) => {
      const nextValue = !value
      localStorage.setItem(storageKey, String(nextValue))
      return nextValue
    })
  }

  return (
    <aside className={`sidebar role-${effectiveRole}${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-brand">
        <img className="sidebar-logo" src={collapsed ? icon : logo} alt="Lightning PDPM" />
        <img className="sidebar-mobile-logo" src={icon} alt="" aria-hidden="true" />
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {collapsed ? 'chevron_right' : 'chevron_left'}
          </span>
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {links.map(([label, iconName, target]) => {
          const href = iconName === 'dashboard' ? dashboardPath : target
          const isActive = href !== '#'
            ? active === href || active.startsWith(`${href}/`)
            : selected?.label === label && selected.path === active
          const className = `sidebar-link${isActive ? ' active' : ''}`
          const content = (
            <>
              <SidebarIcon name={iconName} role={effectiveRole} />
              <span className="sidebar-label">{label}</span>
            </>
          )

          if (href === '#') {
            return (
              <button
                key={label}
                type="button"
                aria-label={label}
                title={collapsed ? label : undefined}
                onClick={() => setSelected({ label, path: active })}
                className={className}
              >
                {content}
              </button>
            )
          }

          return (
            <Link
              key={label}
              to={href}
              aria-label={label}
              title={collapsed ? label : undefined}
              onClick={() => setSelected(null)}
              aria-current={isActive ? 'page' : undefined}
              className={className}
            >
              {content}
            </Link>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-logout"
          onClick={signOut}
          disabled={loggingOut}
          aria-label={loggingOut ? 'Logging out' : logoutLabel(effectiveRole)}
          title={collapsed ? logoutLabel(effectiveRole) : undefined}
        >
          <span className="material-symbols-outlined logout-icon" aria-hidden="true">
            logout
          </span>
          <span className="sidebar-label">
            {loggingOut ? 'Logging out...' : logoutLabel(effectiveRole)}
          </span>
        </button>
        {logoutError && (
          <div role="alert" className="sidebar-logout-error">
            {logoutError}
          </div>
        )}
      </div>
    </aside>
  )
}

function logoutLabel(role) {
  return role === 'admin' ? 'Sign Out' : 'Logout'
}

function getSidebarElements(role) {
  if (role === 'admin') return adminSidebarElements
  if (role === 'pm') return pmSidebarElements
  return userSidebarElements
}

// Admin sidebar elements and access restrictions.
const adminSidebarElements = [
  ['Overview', 'dashboard', '#'],
  ['All Projects & PMs', 'projects', '/projects'],
  ['Tasks', 'tasks', '/tasks'],
  ['Dependencies', 'dependencies', '/dependencies'],
  ['Project Chat', 'chat', '/chat'],
  ['Approvals', 'approvals', '#'],
  ['Workload', 'workload', '#'],
  ['Documents', 'document', '#'],
  ['Users & Accounts', 'users', '#'],
  ['Roles & Permissions', 'roles', '#'],
  ['Database Explorer', 'database', '#'],
  ['Audit Logs', 'audit', '#'],
]

// PM sidebar elements and access restrictions.
const pmSidebarElements = [
  ['Dashboard', 'dashboard', '#'],
  ['Projects', 'projects', '/projects'],
  ['Tasks', 'tasks', '/tasks'],
  ['Dependencies', 'dependencies', '/dependencies'],
  ['Users', 'users', '#'],
  ['Chat', 'chat', '/chat'],
  ['Approvals', 'approvals', '#'],
  ['Workload', 'workload', '#'],
  ['Roles & Permission', 'roles', '#'],
  ['Calendar', 'calendar', '/calendar'],
  ['Document', 'document', '#'],
  ['Audit logs', 'audit', '#'],
]

// User sidebar elements and access restrictions. New roles use this list by default.
const userSidebarElements = [
  ['Dashboard', 'dashboard', '#'],
  ['Tasks', 'tasks', '/tasks'],
  ['Projects', 'projects', '/projects'],
  ['Dependencies', 'dependencies', '/dependencies'],
  ['Chats', 'chat', '/chat'],
  ['Approvals', 'approvals', '#'],
  ['Calendar', 'calendar', '/calendar'],
  ['Document', 'document', '#'],
  ['Audit Logs', 'audit', '#'],
  ['Users', 'users', '#'],
  ['Roles & Permissions', 'roles', '#'],
  ['Workload', 'workload', '#'],
]
