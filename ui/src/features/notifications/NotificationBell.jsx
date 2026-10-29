import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from './notificationService.js';
import useNotificationNavigation from './useNotificationNavigation.js';

function renderFormattedMessage(text) {
  if (!text) return "";
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-bold! [color:var(--color-slate-900)]!">
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
  const { openNotification, feedback } = useNotificationNavigation();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    let active = true;
    const update = page => {
      if (active) { setNotifications(page.results); setUnreadCount(page.unread_count); }
    };
    const unsubscribe = notificationService.subscribe(update);
    notificationService.getSnapshot().then(update).catch(error => console.warn('Could not fetch notifications:', error));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

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
    if (await openNotification(notif.id)) setIsOpen(false);
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
      className={`notification-bell-container ${className}` + " " + "relative! inline-flex! items-center!"}

    >
      {/* Bell Trigger Button */}
      {feedback}
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
        className={'' + ' ' + "hover:[background-color:rgba(241,_245,_249,_0.8)]!"}

      >
        <span
          className={"material-symbols-outlined" + " " + "text-[21px]! block! leading-[1]!"}

        >
          notifications
        </span>
        {unreadCount > 0 && (
          <span
            className="absolute! top-[6px]! right-[6px]! w-[8px]! h-[8px]! rounded-[50%]! [background-color:var(--color-danger)]! [border:2px_solid_var(--color-white)]! pointer-events-none!"
          />
        )}
      </button>

      {/* Popover Dropdown matching design mockup */}
      {isOpen && (
        <div
          className={align === "right" ? "[position:absolute]! [top:calc(100%_+_8px)]! [right:0]! [width:440px]! [max-width:calc(100vw_-_28px)]! [background-color:var(--color-white)]! [border-radius:14px]! [box-shadow:0_20px_40px_-10px_rgba(15,_23,_42,_0.18),_0_0_0_1px_rgba(15,_23,_42,_0.08)]! [z-index:9999]! [overflow:hidden]! [font-family:'Inter',_-apple-system,_BlinkMacSystemFont,_sans-serif]! [display:flex]! [flex-direction:column]! [animation:notifPopoverFadeIn_0.16s_ease-out_forwards]!" : "[position:absolute]! [top:calc(100%_+_8px)]! [left:0]! [width:440px]! [max-width:calc(100vw_-_28px)]! [background-color:var(--color-white)]! [border-radius:14px]! [box-shadow:0_20px_40px_-10px_rgba(15,_23,_42,_0.18),_0_0_0_1px_rgba(15,_23,_42,_0.08)]! [z-index:9999]! [overflow:hidden]! [font-family:'Inter',_-apple-system,_BlinkMacSystemFont,_sans-serif]! [display:flex]! [flex-direction:column]! [animation:notifPopoverFadeIn_0.16s_ease-out_forwards]!"}
        >

          {/* Header */}
          <div
            className="p-[16px_20px_14px]! flex! justify-between! items-center! [border-bottom:1px_solid_var(--color-slate-200)]!"
          >
            <div className="flex! items-center!">
              <span
                className="text-[17px]! font-bold! [color:var(--color-slate-900)]! tracking-[-0.3px]!"
              >
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  className="ml-[10px]! [background-color:var(--color-danger-border)]! [color:var(--color-danger)]! text-[12px]! font-semibold! p-[2px_8px]! rounded-[12px]! leading-[1.4]!"
                >
                  {unreadCount} new
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleMarkAllRead}
              className={"[background:none]! border-0! [color:var(--color-primary)]! text-[13px]! font-semibold! cursor-pointer! p-[4px_2px]! [font-family:inherit]!" + ' ' + "hover:underline!"}

            >
              Mark all read
            </button>
          </div>

          {/* Notifications List */}
          <div
            className="max-h-[380px]! overflow-y-auto! flex! flex-col!"
          >
            {notifications.length === 0 ? (
              <div
                className="p-[36px_20px]! text-center! [color:var(--color-slate-400)]! text-[13px]!"
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
                    className={(isHighlighted ? "notif-row-highlighted" : "notif-row-hover") + " " + "flex! gap-[14px]! p-[14px_20px]! [border-bottom:1px_solid_var(--color-slate-200)]! cursor-pointer! items-start! [transition:background-color_0.15s_ease]!"}
                    style={{
  backgroundColor: rowBg
}}
                  >
                    {/* Status Dot */}
                    <div
                      className="w-[8px]! h-[8px]! rounded-[50%]! mt-[6px]! shrink-0!" style={{
  backgroundColor: dotColor
}}
                    />

                    {/* Message Body & Subtitle */}
                    <div className="flex-1! min-w-0!">
                      <div
                        className="text-[13px]! leading-[1.45]! [color:var(--color-slate-800)]! [word-break:break-word]!"
                      >
                        {renderFormattedMessage(
                          n.formatted_text || n.message || n.title
                        )}
                      </div>

                      <div
                        className="text-[11.5px]! [color:var(--color-slate-400)]! mt-[5px]! flex! items-center! gap-[14px]!"
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
            className="p-[12px_16px]! [background-color:var(--color-white)]! [border-top:1px_solid_var(--color-slate-200)]!"
          >
            <button
              type="button"
              onClick={handleOpenInbox}
              className={"w-full! [background-color:var(--color-slate-100)]! [border:1px_solid_var(--color-slate-200)]! rounded-[8px]! p-[11px_16px]! flex! items-center! justify-center! gap-[8px]! text-[13.5px]! font-semibold! [color:var(--color-slate-900)]! cursor-pointer! [transition:background-color_0.15s_ease]! [font-family:inherit]!" + ' ' + "hover:[background-color:var(--color-slate-200)]!"}

            >
              <span>Open notification inbox</span>
              <span className="text-[15px]!">→</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
