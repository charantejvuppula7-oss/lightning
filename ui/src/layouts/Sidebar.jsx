import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { logout } from '../features/auth/api/authApi.js'
import { roleSlug } from '../utils/roles.js'
import { sidebarItems, sidebarItemActive } from './sidebarNavigation.js'
import Navbar from './Navbar.jsx'
import useAppVersion from '../app/hooks/useAppVersion.js'
import lightningLogoLight from '../assets/lightning-logo-light.png'
import lightningIcon from '../assets/lightning-icon.png'
import './sidebar.css'

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
      className={`app-sidebar ${effectiveRole}-sidebar`}
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        padding: sidebarPadding,
        transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1), padding 0.25s ease",
        background: "var(--color-white)",
        borderRight: "1px solid var(--color-slate-200)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        boxSizing: "border-box",
        height: "100dvh",
        maxHeight: "100dvh",
        minHeight: 0,
        position: "sticky",
        top: 0,
        alignSelf: "flex-start",
        overflow: "hidden",
        zIndex: 50,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <style>{`
        .shared-sidebar-scrollable {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .shared-sidebar-scrollable::-webkit-scrollbar {
          display: none;
        }
        .shared-sidebar-nav-btn:hover {
          background-color: var(--color-slate-50) !important;
          color: var(--color-slate-900) !important;
        }
        .shared-sidebar-nav-btn.active {
          background-color: var(--color-primary-subtle) !important;
          color: var(--color-primary) !important;
        }
        .shared-sidebar-nav-btn.active:hover {
          background-color: var(--color-primary-subtle) !important;
          color: var(--color-primary) !important;
        }
        .shared-sidebar-logout-btn-slate:hover {
          background-color: var(--color-slate-300) !important;
        }
        .shared-sidebar-logout-btn-red:hover {
          background-color: var(--color-danger-border) !important;
        }
      `}</style>

      {/* Top Header: Logo + Toggle Button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "space-between",
          height: "40px",
          padding: "0 2px",
          width: "100%",
          boxSizing: "border-box",
          flexShrink: 0,
          marginBottom: effectiveRole === "user" ? "20px" : "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            overflow: "hidden",
            textDecoration: "none",
          }}
        >
          {isCollapsed ? (
            <img
              src={lightningIcon}
              alt="Lightning PDPM"
              style={{
                width: effectiveRole === "admin" ? "30px" : "26px",
                height: effectiveRole === "admin" ? "30px" : "26px",
                borderRadius: effectiveRole === "admin" ? "6px" : "4px",
                objectFit: "contain",
                display: "block",
                flexShrink: 0,
              }}
            />
          ) : (
            <>
              <img
                src={lightningLogoLight}
                alt="Lightning PDPM"
                style={{
                  height: effectiveRole === "admin" ? "30px" : "28px",
                  width: "auto",
                  maxWidth: effectiveRole === "admin" ? "150px" : "140px",
                  objectFit: "contain",
                  display: "block",
                  flexShrink: 1,
                }}
              />
              {(version || isLoadingVersion) && (
                <span
                  aria-label={version ? `Version ${version}` : "Loading version"}
                  title={version ? `Version ${version}` : "Loading version"}
                  style={{
                    flexShrink: 0,
                    fontSize: "9px",
                    lineHeight: 1,
                    fontWeight: "600",
                    color: "var(--color-slate-500)",
                    whiteSpace: "nowrap",
                  }}
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
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-slate-500)",
            padding: "4px",
            borderRadius: "6px",
            transition: "all 0.15s ease",
            flexShrink: 0,
            marginRight: isCollapsed ? 0 : "-6px",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
            {isCollapsed ? "chevron_right" : "chevron_left"}
          </span>
        </button>
      </div>

      {/* Navigation Menu (Scrollable between Logo and Logout) */}
      <div
        className="shared-sidebar-scrollable"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          flex: "1 1 0%",
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          overscrollBehavior: "contain",
          paddingRight: isCollapsed ? "0px" : "4px",
        }}
      >
        {effectiveRole === "admin" && !isCollapsed && (
          <div
            style={{
              fontSize: "10px",
              fontWeight: "700",
              color: "var(--color-slate-400)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              padding: "4px 10px 8px 10px",
            }}
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
              className={`shared-sidebar-nav-btn ${active ? "active" : ""}`}
              role="link" tabIndex={0} aria-label={item.label} aria-current={active ? "page" : undefined}
              onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); navigate(item.path); } }}
              title={isCollapsed ? item.label : ""}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: isCollapsed ? "10px 0" : "10px 12px",
                justifyContent: isCollapsed ? "center" : "flex-start",
                borderRadius: "8px",
                fontSize: effectiveRole === "admin" ? "13px" : "14px",
                fontWeight: active ? "600" : "500",
                color: active ? "var(--color-primary)" : "var(--color-slate-600)",
                backgroundColor: active ? "var(--color-primary-subtle)" : "transparent",
                cursor: "pointer",
                transition: "all 0.15s ease",
                userSelect: "none",
              }}
              onClick={() => navigate(item.path)}
            >
              <SidebarIcon name={item.icon} role={effectiveRole} />
              {!isCollapsed && (
                <>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
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
        style={{
          marginTop: "auto",
          flex: "0 0 auto",
          position: "sticky",
          bottom: 0,
          zIndex: 1,
          paddingTop: effectiveRole === "admin" ? "14px" : "12px",
          paddingBottom: "max(8px, env(safe-area-inset-bottom))",
          borderTop: "1px solid var(--color-slate-100)",
          width: "100%",
          backgroundColor: "var(--color-white)",
        }}
      >
        <button
          type="button"
          className={effectiveRole === "admin" ? "shared-sidebar-logout-btn-red" : "shared-sidebar-logout-btn-slate"}
          title={isCollapsed ? (effectiveRole === "admin" ? "Sign Out" : "Logout") : ""}
          aria-label={effectiveRole === "admin" ? "Sign Out" : "Logout"}
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            display: "flex",
            alignItems: "center",
            gap: effectiveRole === "admin" ? "12px" : "10px",
            padding: isCollapsed
              ? "10px 0"
              : effectiveRole === "admin"
                ? "10px 12px"
                : "10px 14px",
            justifyContent: isCollapsed ? "center" : "flex-start",
            borderRadius: effectiveRole === "admin" ? "8px" : "6px",
            fontSize: effectiveRole === "admin" ? "13px" : "14px",
            fontWeight: "600",
            color: effectiveRole === "admin" ? "var(--color-danger-dark)" : "var(--color-slate-800)",
            backgroundColor: effectiveRole === "admin" ? "var(--color-danger-bg)" : "var(--color-slate-200)",
            cursor: "pointer",
            transition: "all 0.15s ease",
            userSelect: "none",
            width: "100%",
            border: "none",
            fontFamily: "inherit",
            textAlign: "left",
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

export function SidebarLayout({ user, children, searchQuery, onSearchChange, navbarProps }) {
  const { pathname } = useLocation()
  const effectiveRole = user ? roleSlug(user.role) : pathname.startsWith('/admin/') ? 'admin' : pathname.startsWith('/pm/') ? 'pm' : 'user'

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', background: 'var(--color-slate-50)', color: 'var(--color-slate-900)' }}>
      <Sidebar active={pathname.replace(/\/$/, '')} effectiveRole={effectiveRole} permissions={user?.permissions} canAccessChat={user?.can_access_chat} />
      <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Navbar user={user} searchQuery={searchQuery} onSearchChange={onSearchChange} {...navbarProps} />
        <main style={{ minWidth: 0, flex: 1 }}>{children}</main>
      </div>
    </div>
  )
}
