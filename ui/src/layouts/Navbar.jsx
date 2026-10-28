import { useLocation, useNavigate } from 'react-router-dom'
import GlobalSearch from '../shared/components/GlobalSearch.jsx'
import ProjectSelector from '../features/projects/ProjectSelector.jsx'
import { navigateToSearchResult } from '../shared/utils/searchNavigation.js'
import { NotificationBell } from '../features/notifications/NotificationBell.jsx'
import { roleSlug } from '../shared/utils/roles.js'

const getInitials = user => `${(user.first_name || user.First_Name || '').trim()[0] || ''}${(user.last_name || user.Last_Name || '').trim()[0] || ''}`.toUpperCase()

export default function Navbar({ role: roleProp, showProjectSelector, onProjectSelect, title, subtitle, badge, icon, leftContent, showSearch = true, searchQuery, onSearchChange, onSearchResult, localSearchData = {}, searchPlaceholder = 'Search tasks, docs, people....', showNotificationBell = true, onOpenNotifications, onOpenInbox, showAvatar = true, user: currentUser, avatarColor, avatarClassName = '', rightGap = 12, avatarInitials: propInitials, onAvatarClick, actions, rightContent, children, beforeAvatar, className = '' }) {
 const navigate = useNavigate()
 const location = useLocation()
 const role = roleSlug(roleProp || currentUser?.role)
 const effectiveRole = location.pathname.startsWith('/admin/') ? 'admin' : role === 'admin' || role === 'pm' ? role : 'user'
  // Derive initials
  const userInitials =
    propInitials ||
    (currentUser ? getInitials(currentUser) : "") ||
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
      className={`app-navbar ${effectiveRole}-navbar h-[50px] min-h-[50px] max-h-[50px] bg-white border-b border-(--color-slate-200) flex items-center justify-between px-[24px] sticky top-0 z-40 w-full shrink-0 [font-family:Inter,sans-serif] ${className}`}
    >
      {/* ── LEFT SECTION ──────────────────────────────────────────────── */}
      <div className="flex! items-center! gap-[12px]! min-w-0!">
        {leftContent ? (
          leftContent
        ) : title ? (
          <div className="flex! items-center! gap-[10px]!">
            {icon && (
              <span
                className={"material-symbols-outlined" + " " + "text-[20px]! [color:var(--color-primary)]!"}

              >
                {icon}
              </span>
            )}
            <div>
              <div className="flex! items-center! gap-[8px]!">
                <h1
                  className="text-[16px]! font-bold! [color:var(--color-slate-900)]! m-0! leading-[1.2]!"
                >
                  {title}
                </h1>
                {badge && (
                  <span
                    className="text-[11px]! font-semibold! [background-color:var(--color-primary-subtle)]! [color:var(--color-primary)]! p-[2px_8px]! rounded-[6px]!"
                  >
                    {badge}
                  </span>
                )}
              </div>
              {subtitle && (
                <span className="text-[11px]! [color:var(--color-slate-500)]! block!">
                  {subtitle}
                </span>
              )}
            </div>
          </div>
        ) : shouldShowProjectSelector ? (
          <ProjectSelector
            onProjectSelect={onProjectSelect}
            user={currentUser}
          />
        ) : null}
      </div>

      {/* ── RIGHT SECTION ─────────────────────────────────────────────── */}
      <div className="flex items-center shrink-0" style={{ gap: rightGap }}>
        {/* Custom Actions (e.g. Refresh, Add Task, or extra buttons) */}
        {actions}
        {children}
        {rightContent}

        {/* Global Search */}
        {showSearch && (
          location.pathname.endsWith('/chat') && onSearchChange ? <div className="flex! items-center! gap-[8px]! w-[220px]! h-[34px]! [border:1px_solid_var(--color-slate-300)]! rounded-[8px]! p-[0_12px]! [background:white]!"><span className={"material-symbols-outlined" + " " + "text-[18px]! [color:var(--color-slate-400)]!"} >search</span><input aria-label="Search messages" placeholder={searchPlaceholder} value={searchQuery || ''} onChange={onSearchChange} className="border-0! [outline:0]! [background:none]! w-full! [font:13px_Inter,sans-serif]!" /></div> : <GlobalSearch
            value={searchQuery}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            localData={localSearchData}
            dropdownAlignment="right"
            className="w-[260px]!"
            onSelectResult={handleSearchResult}
          />
        )}

        {/* Notification Bell */}
        {showNotificationBell && (
          <NotificationBell onOpenInbox={handleOpenInbox} />
        )}

        {beforeAvatar}

        {/* User Profile Avatar */}
        {showAvatar && (
          <div
            role="button" tabIndex={0} aria-label="Open my profile"
            onKeyDown={event => { if (event.key === "Enter" || event.key === " ") handleAvatarClick() }}
            onClick={handleAvatarClick}
            title={avatarTooltip}
            style={{ backgroundColor: resolvedAvatarBg }}
            className={`flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[50%] text-white text-[12px] font-bold cursor-pointer select-none transition-transform duration-150 hover:scale-[1.06] ${effectiveRole === 'user' ? 'shadow-[0_2px_4px_rgba(30,58,138,0.25)]' : effectiveRole === 'pm' ? 'shadow-[0_2px_4px_rgba(249,115,22,0.25)]' : 'shadow-[0_2px_4px_rgba(37,99,235,0.25)]'} ${avatarClassName}`}
          >
            {userInitials}
          </div>
        )}
      </div>
    </header>
  );
}
