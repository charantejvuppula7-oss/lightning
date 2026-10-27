import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout } from '../features/auth/api/authApi.js'
import { sidebarItems, sidebarItemActive } from './sidebarNavigation.js'
import useAppVersion from '../shared/hooks/useAppVersion.js'
import lightningLogoLight from '../assets/lightning-logo-light.png'
import lightningIcon from '../assets/lightning-icon.png'

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
      <span className="material-symbols-outlined sidebar-icon" aria-hidden="true">
        {materialIcons[name] || name}
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

export default function Sidebar({ active: currentPath, effectiveRole: role = 'developer', permissions = {}, canAccessChat = false, onLogout, isCollapsed: controlledCollapsed, onToggle }) {
  const navigate = useNavigate()
  const effectiveRole = ['admin', 'pm'].includes(role) ? role : 'user'
  const userRole = !['admin', 'pm'].includes(effectiveRole)
  const storageKey = userRole ? (localStorage.getItem('dev-sidebar-collapsed') !== null ? 'dev-sidebar-collapsed' : 'user-sidebar-collapsed') : `${effectiveRole}-sidebar-collapsed`
  const [internalCollapsed, setInternalCollapsed] = useState(() => localStorage.getItem(storageKey) === 'true')
  const isCollapsed = controlledCollapsed ?? internalCollapsed
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const version = useAppVersion()
  const isLoadingVersion = false
  const menuItems = sidebarItems(effectiveRole, permissions, canAccessChat)
  const handleToggle = () => {
    if (onToggle) return onToggle()
    setInternalCollapsed(previous => {
      localStorage.setItem(storageKey, String(!previous))
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
      setLogoutError('Unable to log out. Please try again.')
      setLoggingOut(false)
    }
  }
  const sidebarWidth = isCollapsed ? "68px" : effectiveRole === "admin" ? "240px" : "220px";
  const sidebarPadding = isCollapsed
    ? effectiveRole === "admin"
      ? "20px 8px"
      : "16px 8px"
    : effectiveRole === "admin"
      ? "20px 16px"
      : "16px 14px";

  return (
    <div
      className={`app-sidebar ${effectiveRole}-sidebar` + " " + "[transition:width_0.25s_cubic-bezier(0.4,_0,_0.2,_1),_padding_0.25s_ease]! [background:var(--color-white)]! [border-right:1px_solid_var(--color-slate-200)]! flex! flex-col! shrink-0! box-border! h-dvh! max-h-[100dvh]! min-h-0! sticky! top-[0]! [align-self:flex-start]! overflow-hidden! z-[50]! [font-family:'Inter',_sans-serif]!"}
      style={{
  width: sidebarWidth,
  minWidth: sidebarWidth,
  padding: sidebarPadding
}}
    >

      {/* Top Header: Logo + Toggle Button */}
      <div
        className="flex! items-center! h-[40px]! p-[0_2px]! w-full! box-border! shrink-0!" style={{
  justifyContent: isCollapsed ? "center" : "space-between",
  marginBottom: effectiveRole === "user" ? "20px" : "16px"
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
  width: effectiveRole === "admin" ? "30px" : "26px",
  height: effectiveRole === "admin" ? "30px" : "26px",
  borderRadius: effectiveRole === "admin" ? "6px" : "4px"
}}
            />
          ) : (
            <>
              <img
                src={lightningLogoLight}
                alt="Lightning PDPM"
                className="w-auto! object-contain! block! [flex-shrink:1]!" style={{
  height: effectiveRole === "admin" ? "30px" : "28px",
  maxWidth: effectiveRole === "admin" ? "150px" : "140px"
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
          <span className={"material-symbols-outlined" + " " + "text-[20px]!"} >
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
  justifyContent: isCollapsed ? "center" : "flex-start",
  fontSize: effectiveRole === "admin" ? "13px" : "14px",
  fontWeight: active ? "600" : "500",
  color: active ? "var(--color-primary)" : "var(--color-slate-600)",
  backgroundColor: active ? "var(--color-primary-subtle)" : "transparent"
}}
              onClick={() => navigate(item.path)}
            >
              <SidebarIcon name={item.icon} role={effectiveRole} />
              {!isCollapsed && (
                <>
                  <span className="whitespace-nowrap! overflow-hidden! text-ellipsis! flex-1!">
                    {item.label}
                  </span>

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
  paddingTop: effectiveRole === "admin" ? "14px" : "12px"
}}
      >
        <button
          type="button"
          className={(effectiveRole === "admin" ? "shared-sidebar-logout-btn-red" : "shared-sidebar-logout-btn-slate") + " " + "flex! items-center! font-semibold! cursor-pointer! [transition:all_0.15s_ease]! select-none! w-full! border-0! [font-family:inherit]! text-left!"}
          title={isCollapsed ? (effectiveRole === "admin" ? "Sign Out" : "Logout") : ""}
          aria-label={effectiveRole === "admin" ? "Sign Out" : "Logout"}
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
  gap: effectiveRole === "admin" ? "12px" : "10px",
  padding: isCollapsed ? "10px 0" : effectiveRole === "admin" ? "10px 12px" : "10px 14px",
  justifyContent: isCollapsed ? "center" : "flex-start",
  borderRadius: effectiveRole === "admin" ? "8px" : "6px",
  fontSize: effectiveRole === "admin" ? "13px" : "14px",
  color: effectiveRole === "admin" ? "var(--color-danger-dark)" : "var(--color-slate-800)",
  backgroundColor: effectiveRole === "admin" ? "var(--color-danger-bg)" : "var(--color-slate-200)"
}}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: `${effectiveRole === "admin" ? 19 : 20}px`,
              color: effectiveRole === "admin" ? "var(--color-danger-dark)" : "var(--color-slate-800)",
            }}
            aria-hidden="true"
          >
            logout
          </span>
          {!isCollapsed && (effectiveRole === "admin" ? "Sign Out" : "Logout")}
        </button>
      </div>
    </div>
  );
}
