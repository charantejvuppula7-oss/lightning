import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import GlobalSearch from '../components/common/GlobalSearch.jsx'
import ProjectSelector from '../components/common/ProjectSelector.jsx'
import { navigateToSearchResult } from '../components/common/searchNavigation.js'
import { NotificationBell } from '../features/notifications/NotificationBell.jsx'
import { getSession } from '../features/auth/api/authApi.js'
import { roleSlug } from '../utils/roles.js'

const getPMInitials = user => `${(user.first_name || user.First_Name || '').trim()[0] || ''}${(user.last_name || user.Last_Name || '').trim()[0] || ''}`.toUpperCase()

export default function Navbar({ role: roleProp, showProjectSelector, projects = [], projectOptions = [], selectedProjectId, selectedProjectName, selectedProject, activeProjectObj, onProjectSelect, title, subtitle, badge, icon, leftContent, showSearch = true, searchQuery, searchValue, onSearchChange, setSearchQuery, onSearchResult, localSearchData = {}, searchPlaceholder = 'Search tasks, docs, people....', searchStyle, showNotificationBell = true, onOpenNotifications, onOpenInbox, showAvatar = true, currentPM: propPM, currentUser: propUser, user: propGenericUser, avatarColor, avatarStyle, rightStyle, avatarInitials: propInitials, onAvatarClick, actions, rightContent, children, style, className }) {
 const navigate = useNavigate()
 const location = useLocation()
 const role = roleSlug(roleProp || propGenericUser?.role || propUser?.role || propPM?.role)
 const effectiveRole = location.pathname.startsWith('/admin/') ? 'admin' : role === 'admin' || role === 'pm' ? role : 'user'
 const incoming = propPM || propUser || propGenericUser
 const [sessionUser, setSessionUser] = useState(null)
 useEffect(() => {
   if (incoming) return
   let active = true
   getSession().then(data => { if (active) setSessionUser(data.user) }).catch(() => {})
   return () => { active = false }
 }, [incoming])
 const currentUser = incoming || sessionUser
  // Derive initials
  const userInitials =
    propInitials ||
    (currentUser ? getPMInitials(currentUser) : "") ||
    (effectiveRole === "admin" ? "AD" : effectiveRole === "user" ? "U" : "PM");

  // Derive avatar display name for tooltip
  const avatarTooltip =
    currentUser?.User_Name ||
    currentUser?.username ||
    currentUser?.user_name ||
    (currentUser
      ? `${currentUser.first_name || currentUser.First_Name || ""} ${currentUser.last_name || currentUser.Last_Name || ""}`.trim()
      : effectiveRole === "admin"
      ? "Admin"
      : effectiveRole === "user"
      ? "My Profile"
      : "Project Manager");

  // Determine if project selector should display
  const shouldShowProjectSelector =
    typeof showProjectSelector === "boolean"
      ? showProjectSelector
      : !title && !leftContent;

  // ── Search Callback ─────────────────────────────────────────────────────
  const currentSearchVal = searchValue !== undefined ? searchValue : searchQuery;
  const currentSearchChange = onSearchChange || (setSearchQuery ? (e) => setSearchQuery(e.target.value) : undefined);

  const handleSearchResult = (item) => {
    if (onSearchResult) {
      onSearchResult(item);
      return;
    }
    navigateToSearchResult(item, navigate);
  };

  // ── Notification Click ──────────────────────────────────────────────────
  const handleOpenInbox = () => {
    if (onOpenNotifications) {
      onOpenNotifications();
      return;
    }
    if (onOpenInbox) {
      onOpenInbox();
      return;
    }
    if (effectiveRole === "pm") {
      navigate("/pm/notifications");
    } else if (effectiveRole === "user") {
      navigate("/user/dashboard", { state: { tab: "notifications" } });
    } else {
      navigate("/admin/notifications");
    }
  };

  // ── Avatar Click ────────────────────────────────────────────────────────
  const handleAvatarClick = () => {
    if (onAvatarClick) {
      onAvatarClick();
      return;
    }
    if (effectiveRole === "pm") {
      navigate("/pm/profile");
    } else if (effectiveRole === "user") {
      navigate("/user/profile");
    } else {
      navigate("/admin/profile");
    }
  };

  // Avatar default colors by role
  const resolvedAvatarBg =
    avatarColor ||
    (effectiveRole === "pm"
      ? "var(--color-role-pm)"
      : effectiveRole === "user"
      ? "#1E3A8A"
      : "var(--color-slate-900)");

  return (
    <header
      className={`app-navbar ${effectiveRole}-navbar ${className || ""}`}
      style={{
        height: "50px",
        minHeight: "50px",
        maxHeight: "50px",
        backgroundColor: "var(--color-white)",
        borderBottom: "1px solid var(--color-slate-200)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        boxSizing: "border-box",
        position: "sticky",
        top: 0,
        zIndex: 40,
        width: "100%",
        flexShrink: 0,
        fontFamily: "'Inter', sans-serif",
        ...style,
      }}
    >
      {/* ── LEFT SECTION ──────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
        {leftContent ? (
          leftContent
        ) : title ? (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {icon && (
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "20px", color: "var(--color-primary)" }}
              >
                {icon}
              </span>
            )}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h1
                  style={{
                    fontSize: "16px",
                    fontWeight: "700",
                    color: "var(--color-slate-900)",
                    margin: 0,
                    lineHeight: "1.2",
                  }}
                >
                  {title}
                </h1>
                {badge && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      backgroundColor: "var(--color-primary-subtle)",
                      color: "var(--color-primary)",
                      padding: "2px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    {badge}
                  </span>
                )}
              </div>
              {subtitle && (
                <span style={{ fontSize: "11px", color: "var(--color-slate-500)", display: "block" }}>
                  {subtitle}
                </span>
              )}
            </div>
          </div>
        ) : shouldShowProjectSelector ? (
          <ProjectSelector
            projects={projects}
            projectOptions={projectOptions}
            selectedProjectId={selectedProjectId}
            selectedProjectName={selectedProjectName}
            selectedProject={selectedProject || activeProjectObj?.Project_Name || activeProjectObj?.name}
            onProjectSelect={onProjectSelect}
            role={effectiveRole}
            user={currentUser}
          />
        ) : null}
      </div>

      {/* ── RIGHT SECTION ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0, ...rightStyle }}>
        {/* Custom Actions (e.g. Refresh, Add Task, or extra buttons) */}
        {actions}
        {children}
        {rightContent}

        {/* Global Search */}
        {showSearch && (
          location.pathname.endsWith('/chat') && currentSearchChange ? <div style={{display:'flex',alignItems:'center',gap:8,width:220,height:34,border:'1px solid var(--color-slate-300)',borderRadius:8,padding:'0 12px',background:'white'}}><span className="material-symbols-outlined" style={{fontSize:18,color:'var(--color-slate-400)'}}>search</span><input aria-label="Search messages" placeholder={searchPlaceholder} value={currentSearchVal || ''} onChange={currentSearchChange} style={{border:0,outline:0,background:'none',width:'100%',font:'13px Inter,sans-serif'}} /></div> : <GlobalSearch
            value={currentSearchVal}
            onChange={currentSearchChange}
            placeholder={searchPlaceholder}
            localData={localSearchData}
            dropdownAlignment="right"
            style={{ width: "260px", ...searchStyle }}
            onSelectResult={handleSearchResult}
          />
        )}

        {/* Notification Bell */}
        {showNotificationBell && (
          <NotificationBell onOpenInbox={handleOpenInbox} />
        )}

        {/* User Profile Avatar */}
        {showAvatar && (
          <div
            role="button" tabIndex={0} aria-label="Open my profile"
            onKeyDown={event => { if (event.key === "Enter" || event.key === " ") handleAvatarClick() }}
            onClick={handleAvatarClick}
            title={avatarTooltip}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: resolvedAvatarBg,
              color: "var(--color-white)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
              userSelect: "none",
              flexShrink: 0,
              boxShadow:
                effectiveRole === "user"
                  ? "0 2px 4px rgba(30, 58, 138, 0.25)"
                  : effectiveRole === "pm"
                  ? "0 2px 4px rgba(249, 115, 22, 0.25)"
                  : "0 2px 4px rgba(37, 99, 235, 0.25)",
              transition: "transform 0.15s ease",
              ...avatarStyle,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.06)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            {userInitials}
          </div>
        )}
      </div>
    </header>
  );
}
