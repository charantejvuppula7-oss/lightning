import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { logout } from '../features/auth/api/authApi.js'
import { getRoleDashboard } from '../utils/roles.js'
import logo from '../assets/lightning-logo-light.png'
import icon from '../assets/lightning-icon.png'

/* styling */
const tailwindStyling = {
  "material-symbols-outlined": [
    "[font-family:'Material_Symbols_Outlined']",
    "[font-weight:normal]",
    "[font-style:normal]",
    "[font-size:20px]",
    "[line-height:1]",
    "[letter-spacing:normal]",
    "[text-transform:none]",
    "[white-space:nowrap]",
    "[word-wrap:normal]",
    "[direction:ltr]",
    "[font-feature-settings:'liga']",
    "[-webkit-font-smoothing:antialiased]",
    "[&.sidebar-icon]:[font-size:20px]"
  ],
  "sidebar": [
    "[width:220px]",
    "[min-width:220px]",
    "[flex:0_0_220px]",
    "[box-sizing:border-box]",
    "[height:100dvh]",
    "[min-height:0]",
    "[position:sticky]",
    "[top:0]",
    "[align-self:flex-start]",
    "[z-index:50]",
    "[overflow:hidden]",
    "[padding:16px_14px]",
    "[background:var(--color-white)]",
    "[border-right:1px_solid_var(--color-slate-200)]",
    "[display:flex]",
    "[flex-direction:column]",
    "[transition:width_.25s_cubic-bezier(.4,0,.2,1),_flex-basis_.25s_cubic-bezier(.4,0,.2,1),_padding_.25s_ease]",
    "[&.role-admin]:[width:240px]",
    "[&.role-admin]:[min-width:240px]",
    "[&.role-admin]:[flex-basis:240px]",
    "[&.role-admin]:[padding:20px_16px]",
    "[&.collapsed]:[width:68px]",
    "[&.collapsed]:[min-width:68px]",
    "[&.collapsed]:[flex-basis:68px]",
    "[&.collapsed]:[padding:16px_8px]",
    "[&.role-admin.collapsed]:[padding-top:20px]",
    "[&.role-admin_.sidebar-brand_img]:[max-width:150px]",
    "[&.role-admin_.sidebar-brand_img]:[height:30px]",
    "[&.role-admin_.sidebar-link]:[font-size:13px]",
    "[&.role-admin_.sidebar-logout]:[background:#fef2f2]",
    "[&.role-admin_.sidebar-logout]:[color:#dc2626]",
    "[&.role-admin_.sidebar-logout]:[border-radius:8px]",
    "[&.role-admin_.sidebar-logout]:[font-size:13px]",
    "[&.role-admin_.sidebar-logout:hover]:[background:#fee2e2]",
    "[&.collapsed_.sidebar-brand]:[justify-content:center]",
    "[&.collapsed_.sidebar-brand_.sidebar-logo]:[width:26px]",
    "[&.collapsed_.sidebar-brand_.sidebar-logo]:[height:26px]",
    "[&.collapsed_.sidebar-brand_.sidebar-logo]:[object-fit:contain]",
    "[&.collapsed_.sidebar-label]:[display:none]",
    "[&.collapsed_.sidebar-brand_button]:[margin:0]",
    "[&.collapsed_.sidebar-link]:[justify-content:center]",
    "[&.collapsed_.sidebar-link]:[padding-inline:0]",
    "[&.collapsed_.sidebar-logout]:[justify-content:center]",
    "[&.collapsed_.sidebar-logout]:[padding-inline:0]",
    "max-[900px]:[width:68px]",
    "max-[900px]:[min-width:68px]",
    "max-[900px]:[flex-basis:68px]",
    "max-[900px]:[padding:16px_8px]",
    "max-[900px]:[&.role-admin]:[width:68px]",
    "max-[900px]:[&.role-admin]:[min-width:68px]",
    "max-[900px]:[&.role-admin]:[flex-basis:68px]",
    "max-[900px]:[&.role-admin]:[padding:16px_8px]",
    "max-[900px]:[&.role-admin_.sidebar-brand_.sidebar-mobile-logo]:[display:block]",
    "max-[900px]:[&.role-admin_.sidebar-brand_.sidebar-mobile-logo]:[width:26px]",
    "max-[900px]:[&.role-admin_.sidebar-brand_.sidebar-mobile-logo]:[height:26px]"
  ],
  "sidebar-brand": [
    "[flex:0_0_40px]",
    "[display:flex]",
    "[align-items:center]",
    "[justify-content:space-between]",
    "[gap:8px]",
    "[margin-bottom:16px]",
    "[padding:0_2px]",
    "[min-width:0]",
    "[&_img]:[width:auto]",
    "[&_img]:[max-width:140px]",
    "[&_img]:[height:28px]",
    "[&_img]:[object-fit:contain]",
    "[&_img]:[object-position:left_center]",
    "[&_.sidebar-mobile-logo]:[display:none]",
    "[&_button]:[margin-left:auto]",
    "[&_button]:[border:0]",
    "[&_button]:[border-radius:6px]",
    "[&_button]:[background:transparent]",
    "[&_button]:[color:var(--color-slate-500)]",
    "[&_button]:[cursor:pointer]",
    "[&_button]:[line-height:1]",
    "[&_button]:[padding:4px]",
    "[&_button]:[display:grid]",
    "[&_button]:[place-items:center]",
    "[&_button:focus-visible]:[outline:2px_solid_var(--color-primary)]",
    "[&_button:focus-visible]:[outline-offset:2px]",
    "max-[900px]:[justify-content:center]",
    "max-[900px]:[&_.sidebar-logo]:[display:none]",
    "max-[900px]:[&_button]:[display:none]",
    "max-[900px]:[&_.sidebar-mobile-logo]:[display:block]",
    "max-[900px]:[&_.sidebar-mobile-logo]:[width:26px]",
    "max-[900px]:[&_.sidebar-mobile-logo]:[height:26px]"
  ],
  "sidebar-nav": [
    "[min-height:0]",
    "[flex:1_1_0%]",
    "[overflow-y:auto]",
    "[overflow-x:hidden]",
    "[overscroll-behavior:contain]",
    "[display:flex]",
    "[flex-direction:column]",
    "[gap:4px]",
    "[padding-right:4px]",
    "[scrollbar-color:var(--color-slate-400)_var(--color-slate-50)]",
    "max-[900px]:[padding-right:0]"
  ],
  "sidebar-link": [
    "[width:100%]",
    "[flex:0_0_auto]",
    "[display:flex]",
    "[align-items:center]",
    "[gap:12px]",
    "[padding:10px_12px]",
    "[border:0]",
    "[border-radius:8px]",
    "[background:transparent]",
    "[color:var(--color-slate-600)]",
    "[text-decoration:none]",
    "[text-align:left]",
    "[font:inherit]",
    "[font-size:14px]",
    "[font-weight:500]",
    "[white-space:nowrap]",
    "[cursor:pointer]",
    "[&:hover]:[background:var(--color-slate-50)]",
    "[&:hover]:[color:var(--color-slate-900)]",
    "[&.active]:[background:var(--color-primary-subtle)]",
    "[&.active]:[color:var(--color-primary)]",
    "[&.active]:[font-weight:600]",
    "[&.active_.sidebar-icon]:[color:var(--color-primary)]",
    "[&:focus-visible]:[outline:2px_solid_var(--color-primary)]",
    "[&:focus-visible]:[outline-offset:2px]",
    "max-[900px]:[justify-content:center]",
    "max-[900px]:[padding-inline:0]"
  ],
  "sidebar-icon": [
    "[width:20px]",
    "[height:20px]",
    "[flex:0_0_20px]",
    "[color:var(--color-slate-500)]"
  ],
  "sidebar-footer": [
    "[flex:0_0_auto]",
    "[margin-top:auto]",
    "[padding:12px_0_max(8px,_env(safe-area-inset-bottom))]",
    "[border-top:1px_solid_var(--color-slate-100)]",
    "[background:var(--color-white)]"
  ],
  "logout-icon": [
    "[width:20px]",
    "[flex:0_0_20px]",
    "[text-align:center]",
    "[font-size:20px]",
    "[line-height:1]"
  ],
  "sidebar-logout": [
    "[width:100%]",
    "[border:0]",
    "[border-radius:6px]",
    "[background:var(--color-slate-200)]",
    "[color:var(--color-slate-900)]",
    "[display:flex]",
    "[align-items:center]",
    "[gap:10px]",
    "[padding:10px_14px]",
    "[font:inherit]",
    "[font-size:14px]",
    "[font-weight:600]",
    "[text-align:left]",
    "[cursor:pointer]",
    "[white-space:nowrap]",
    "[&:hover]:[background:var(--color-slate-300)]",
    "[&:disabled]:[cursor:wait]",
    "[&:disabled]:[opacity:.7]",
    "[&:focus-visible]:[outline:2px_solid_var(--color-primary)]",
    "[&:focus-visible]:[outline-offset:2px]",
    "max-[900px]:[justify-content:center]",
    "max-[900px]:[padding-inline:0]"
  ],
  "sidebar-logout-error": [
    "[color:#b91c1c]",
    "[font-size:12px]",
    "[padding:6px_2px_0]"
  ],
  "sidebar-label": [
    "max-[900px]:[display:none]"
  ]
}
const styling = value => {
  const classes = typeof value === 'string' ? value : ''
  const utilities = classes.split(/\s+/).flatMap(name => tailwindStyling[name] || [])
  return [...new Set([...classes.split(/\s+/), ...utilities])].filter(Boolean).join(' ')
}



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
  const useCustomIcon = !['admin', 'pm'].includes(role)
    && ['dashboard', 'tasks', 'dependencies', 'chat', 'calendar', 'document'].includes(name)

  if (!useCustomIcon) {
    return (
      <span className={styling("material-symbols-outlined sidebar-icon")} aria-hidden="true">
        {materialIcons[name]}
      </span>
    )
  }

  return (
    <svg
      className={styling("sidebar-icon")}
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

export default function Sidebar({ active, effectiveRole = 'developer', permissions = {}, onLogout }) {
  const navigate = useNavigate()
  const storageKey = `${effectiveRole}-sidebar-collapsed`
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(storageKey) === 'true')
  const [selected, setSelected] = useState(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const dashboardPath = getRoleDashboard(effectiveRole)
  const links = getSidebarElements(permissions, effectiveRole)

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
    <aside className={styling(`sidebar role-${effectiveRole}${collapsed ? ' collapsed' : ''}`)}>
      <div className={styling("sidebar-brand")}>
        <img className={styling("sidebar-logo")} src={collapsed ? icon : logo} alt="Lightning PDPM" />
        <img className={styling("sidebar-mobile-logo")} src={icon} alt="" aria-hidden="true" />
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          <span className={styling("material-symbols-outlined")} aria-hidden="true">
            {collapsed ? 'chevron_right' : 'chevron_left'}
          </span>
        </button>
      </div>

      <nav className={styling("sidebar-nav")} aria-label="Main navigation">
        {links.map(({ label, icon: iconName, to }) => {
          const href = to === 'dashboard' ? dashboardPath : to
          const isActive = href !== '#'
            ? active === href || active.startsWith(`${href}/`)
            : selected?.label === label && selected.path === active
          const className = `sidebar-link${isActive ? ' active' : ''}`
          const content = (
            <>
              <SidebarIcon name={iconName} role={effectiveRole} />
              <span className={styling("sidebar-label")}>{label}</span>
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
                className={styling(className)}
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
              className={styling(className)}
            >
              {content}
            </Link>
          )
        })}
      </nav>

      <div className={styling("sidebar-footer")}>
        <button
          type="button"
          className={styling("sidebar-logout")}
          onClick={signOut}
          disabled={loggingOut}
          aria-label={loggingOut ? 'Logging out' : logoutLabel(effectiveRole)}
          title={collapsed ? logoutLabel(effectiveRole) : undefined}
        >
          <span className={styling("material-symbols-outlined logout-icon")} aria-hidden="true">
            logout
          </span>
          <span className={styling("sidebar-label")}>
            {loggingOut ? 'Logging out...' : logoutLabel(effectiveRole)}
          </span>
        </button>
        {logoutError && (
          <div role="alert" className={styling("sidebar-logout-error")}>
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

const navigation = [
  { label: 'Dashboard', icon: 'dashboard', to: 'dashboard' },
  { label: 'Projects', icon: 'projects', to: '/projects', module: 'Projects' },
  { label: 'Tasks', icon: 'tasks', to: '/tasks', module: 'Tasks' },
  { label: 'Dependencies', icon: 'dependencies', to: '/dependencies', module: 'Dependencies' },
  { label: 'Users', icon: 'users', to: '#', module: 'User Management' },
  { label: 'Chat', icon: 'chat', to: '/chat', module: 'Projects' },
  { label: 'Approvals', icon: 'approvals', to: '#', adminOnly: true },
  { label: 'Workload', icon: 'workload', to: '#', module: 'TeamWorLoad' },
  { label: 'Roles & Permissions', icon: 'roles', to: '#', module: 'Roles & permissions' },
  { label: 'Calendar', icon: 'calendar', to: '/calendar', module: 'Tasks' },
  { label: 'Documents', icon: 'document', to: '#', module: 'Documents' },
  { label: 'Audit Logs', icon: 'audit', to: '/admin/audit-logs', adminOnly: true },
  { label: 'Database Explorer', icon: 'database', to: '/admin/db-explorer', adminOnly: true },
  { label: 'API Logs', icon: 'audit', to: '/admin/api-logs', adminOnly: true },
]

function getSidebarElements(permissions, role) {
  return navigation.filter(item => {
    if (item.adminOnly) return role === 'admin'
    return !item.module || permissions?.[item.module]?.View === true
  })
}
