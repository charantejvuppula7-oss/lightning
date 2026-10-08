import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from './notificationService.js';

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
  "notification": [
    "[width:32px]",
    "[height:32px]",
    "[border:0]",
    "[background:transparent]",
    "[color:var(--color-slate-500)]",
    "[cursor:pointer]",
    "[display:grid]",
    "[place-items:center]",
    "[&_.material-symbols-outlined]:[font-size:20px]"
  ],
  "priority": [
    "[display:inline-flex]",
    "[min-width:73px]",
    "[height:36px]",
    "[align-items:center]",
    "[justify-content:center]",
    "[border-radius:9px]",
    "[font-size:11px]",
    "[&.low]:[background:#c9d77f]",
    "[&.high]:[background:#ef777b]",
    "[&.medium]:[background:#bdc8f7]"
  ]
}
const styling = value => {
  const classes = typeof value === 'string' ? value : ''
  const utilities = classes.split(/\s+/).flatMap(name => tailwindStyling[name] || [])
  return [...new Set([...classes.split(/\s+/), ...utilities])].filter(Boolean).join(' ')
}



function renderFormattedMessage(text) {
  if (!text) return "";
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} style={{ fontWeight: "700", color: "var(--color-slate-900)" }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

/**
 * Helper for human readable relative time
 */
function getRelativeTime(timestamp) {
  if (!timestamp) return "Just now";
  const diffSec = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hr ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} d ago`;
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Reusable NotificationBell component with popover matching the design mockup.
 *
 * Props:
 * - onOpenInbox: callback when "Open notification inbox →" is clicked.
 * - align: 'right' | 'left' (default 'right')
 * - iconStyle: overrides for bell button
 */
export function NotificationBell({
  onOpenInbox,
  align = "right",
  iconStyle = {},
  className = "",
}) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef(null);

  // Fetch notifications from backend
  const fetchNotifications = useCallback(async () => {
    try {
      const [items, count] = await Promise.all([
        notificationService.getRecentNotifications(),
        notificationService.getUnreadCount(),
      ]);
      setNotifications(items);
      setUnreadCount(count);
    } catch (err) {
      console.warn("Could not fetch notifications:", err);
    }
  }, []);

  useEffect(() => {
    const initial = setTimeout(fetchNotifications, 0);
    const interval = setInterval(fetchNotifications, 30000);
    window.addEventListener('notifications:changed', fetchNotifications);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
      window.removeEventListener('notifications:changed', fetchNotifications);
    };
  }, [fetchNotifications]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Mark all as read
  const handleMarkAllRead = async (e) => {
    if (e) e.stopPropagation();
    try {
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn("Error marking all read:", err);
    }
  };

  // Mark individual as read
  const handleItemClick = async (notif) => {
    if (!notif.is_read && notif.id) {
      try {
        await notificationService.markAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((count) => Math.max(0, count - 1));
      } catch (err) {
        console.warn("Error marking notification read:", err);
      }
    }
  };

  const handleOpenInbox = () => {
    setIsOpen(false);
    if (onOpenInbox) {
      onOpenInbox();
    } else {
      navigate("/notifications");
    }
  };

  return (
    <div
      ref={containerRef}
      className={styling(`notification-bell-container ${className}`)}
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
    >
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={isOpen}
        style={{
          background: "transparent",
          border: "none",
          borderRadius: "50%",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: isOpen ? "var(--color-slate-900)" : "var(--color-slate-500)",
          padding: "6px",
          width: "36px",
          height: "36px",
          position: "relative",
          outline: "none",
          transition: "background-color 0.15s ease, color 0.15s ease",
          ...iconStyle,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(241, 245, 249, 0.8)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <span
          className={styling("material-symbols-outlined")}
          style={{ fontSize: "21px", display: "block", lineHeight: 1 }}
        >
          notifications
        </span>
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "6px",
              right: "6px",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "var(--color-danger)",
              border: "2px solid var(--color-white)",
              pointerEvents: "none",
            }}
          />
        )}
      </button>

      {/* Popover Dropdown matching design mockup */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            ...(align === "right" ? { right: 0 } : { left: 0 }),
            width: "440px",
            maxWidth: "calc(100vw - 28px)",
            backgroundColor: "var(--color-white)",
            borderRadius: "14px",
            boxShadow:
              "0 20px 40px -10px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15, 23, 42, 0.08)",
            zIndex: 9999,
            overflow: "hidden",
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            display: "flex",
            flexDirection: "column",
            animation: "notifPopoverFadeIn 0.16s ease-out forwards",
          }}
        >
          <style>
            {`
              @keyframes notifPopoverFadeIn {
                from {
                  opacity: 0;
                  transform: translateY(-6px) scale(0.98);
                }
                to {
                  opacity: 1;
                  transform: translateY(0) scale(1);
                }
              }
              .notif-row-hover:hover {
                background-color: var(--color-slate-50) !important;
              }
              .notif-row-highlighted:hover {
                background-color: #E8F0FE !important;
              }
            `}
          </style>

          {/* Header */}
          <div
            style={{
              padding: "16px 20px 14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid var(--color-slate-200)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <span
                style={{
                  fontSize: "17px",
                  fontWeight: "700",
                  color: "var(--color-slate-900)",
                  letterSpacing: "-0.3px",
                }}
              >
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    marginLeft: "10px",
                    backgroundColor: "var(--color-danger-border)",
                    color: "var(--color-danger)",
                    fontSize: "12px",
                    fontWeight: "600",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    lineHeight: "1.4",
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleMarkAllRead}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-primary)",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                padding: "4px 2px",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = "underline";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = "none";
              }}
            >
              Mark all read
            </button>
          </div>

          {/* Notifications List */}
          <div
            style={{
              maxHeight: "380px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: "36px 20px",
                  textAlign: "center",
                  color: "var(--color-slate-400)",
                  fontSize: "13px",
                }}
              >
                No notifications right now
              </div>
            ) : (
              notifications.map((n, idx) => {
                const isHighlighted = !n.is_read;
                const isRedDot =
                  n.dot_color === "red" ||
                  n.priority === "high" ||
                  String(n.type || "").includes("block") ||
                  String(n.type || "").includes("overdue");
                const dotColor = isRedDot ? "var(--color-danger)" : "var(--color-primary)";
                const rowBg = isHighlighted ? "#EEF4FF" : "var(--color-white)";

                return (
                  <div
                    key={n.id || idx}
                    onClick={() => handleItemClick(n)}
                    className={styling(
                      isHighlighted
                        ? "notif-row-highlighted"
                        : "notif-row-hover"
                    )}
                    style={{
                      display: "flex",
                      gap: "14px",
                      padding: "14px 20px",
                      backgroundColor: rowBg,
                      borderBottom: "1px solid var(--color-slate-200)",
                      cursor: "pointer",
                      alignItems: "flex-start",
                      transition: "background-color 0.15s ease",
                    }}
                  >
                    {/* Status Dot */}
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: dotColor,
                        marginTop: "6px",
                        flexShrink: 0,
                      }}
                    />

                    {/* Message Body & Subtitle */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "13px",
                          lineHeight: "1.45",
                          color: "var(--color-slate-800)",
                          wordBreak: "break-word",
                        }}
                      >
                        {renderFormattedMessage(
                          n.formatted_text || n.message || n.title
                        )}
                      </div>

                      <div
                        style={{
                          fontSize: "11.5px",
                          color: "var(--color-slate-400)",
                          marginTop: "5px",
                          display: "flex",
                          alignItems: "center",
                          gap: "14px",
                        }}
                      >
                        <span>{n.project || "Project"}</span>
                        <span>{getRelativeTime(n.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Button */}
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "var(--color-white)",
              borderTop: "1px solid var(--color-slate-200)",
            }}
          >
            <button
              type="button"
              onClick={handleOpenInbox}
              style={{
                width: "100%",
                backgroundColor: "var(--color-slate-100)",
                border: "1px solid var(--color-slate-200)",
                borderRadius: "8px",
                padding: "11px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontSize: "13.5px",
                fontWeight: "600",
                color: "var(--color-slate-900)",
                cursor: "pointer",
                transition: "background-color 0.15s ease",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-slate-200)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-slate-100)";
              }}
            >
              <span>Open notification inbox</span>
              <span style={{ fontSize: "15px" }}>→</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


