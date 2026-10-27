import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { notificationService } from './notificationService.js';

export function NotificationPopup() {
  const location = useLocation();
  const navigate = useNavigate();

  const [popupData, setPopupData] = useState(null); // { title, message, badge, count, id }
  const [isVisible, setIsVisible] = useState(false);
  const knownNotificationIds = useRef(new Set());
  const hasCheckedLoginPopup = useRef(false);
  const dismissTimerRef = useRef(null);
  const isLoginPopupRef = useRef(false);

  const isAuthPage = [
    "/login",
    "/admin/login",
    "/forgot-password",
    "/reset-password",
    "/verify-identity",
  ].some((path) => location.pathname.startsWith(path));

  // Dismiss popup with smooth fade/slide out
  const dismissPopup = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    setIsVisible(false);
    setTimeout(() => {
      setPopupData(null);
    }, 280);
  }, []);

  // Show a popup and schedule auto-dismiss in 6 seconds
  const showPopup = useCallback((data, autoCloseMs = 6000, pauseOnHover = true) => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
    }
    isLoginPopupRef.current = !pauseOnHover;
    setPopupData(data);
    setIsVisible(true);

    // Auto-dismiss after the requested duration
    dismissTimerRef.current = setTimeout(() => {
      dismissPopup();
    }, autoCloseMs);
  }, [dismissPopup]);

  // Handle mouse hover to pause dismiss timer
  const handleMouseEnter = () => {
    if (!isLoginPopupRef.current && dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    if (!isLoginPopupRef.current && isVisible && !dismissTimerRef.current) {
      dismissTimerRef.current = setTimeout(() => {
        dismissPopup();
      }, 3500);
    }
  };

  // Fetch notifications and evaluate login popup or new message popup
  const checkNotifications = useCallback(
    async (isInitialCheck = false) => {
      if (isAuthPage) return;

      try {
        const page = await notificationService.getSnapshot();
        const notifList = page.results;
        const unreadList = notifList.filter((n) => !n.is_read);
        const unreadCount = unreadList.length;

        // ── 1. Login / First Session Load Check ──
        if (isInitialCheck && !hasCheckedLoginPopup.current) {
          hasCheckedLoginPopup.current = true;
          const wasJustLoggedIn = sessionStorage.getItem("just_logged_in") === "true";
          sessionStorage.removeItem("just_logged_in");

          // Populate known IDs to avoid re-triggering as "new messages"
          notifList.forEach((n) => n.id && knownNotificationIds.current.add(n.id));

          if (unreadCount > 0 || wasJustLoggedIn) {
            if (unreadCount > 0) {
              const latest = unreadList[0];
              const badgeText = `${unreadCount} New`;
              const titleText =
                unreadCount === 1
                  ? "You have 1 new notification"
                  : `You have ${unreadCount} new notifications`;

              showPopup({
                badge: badgeText,
                title: titleText,
                message:
                  latest.message ||
                  latest.formatted_text ||
                  "Check your notification inbox for recent updates.",
                count: unreadCount,
                id: latest.id,
              }, wasJustLoggedIn ? 1500 : 6000, !wasJustLoggedIn);
            }
          }
          return;
        }

        // ── 2. Real-Time Occurrence Check (Poll for new messages/nudges) ──
        if (!isInitialCheck) {
          const newItems = unreadList.filter(
            (n) => n.id && !knownNotificationIds.current.has(n.id)
          );

          if (newItems.length > 0) {
            // Update known IDs
            newItems.forEach((n) => knownNotificationIds.current.add(n.id));
            const latestNew = newItems[0];
            const badgeText = `${newItems.length} New`;
            const titleText =
              newItems.length === 1
                ? "You have 1 new notification"
                : `You have ${newItems.length} new notifications`;

            showPopup({
              badge: badgeText,
              title: titleText,
              message:
                latestNew.message ||
                latestNew.formatted_text ||
                "A new message or task update has occurred.",
              count: newItems.length,
              id: latestNew.id,
            });
          }
        }

        // Keep known IDs updated
        notifList.forEach((n) => n.id && knownNotificationIds.current.add(n.id));
      } catch {
        // Silently catch network errors during background polling
      }
    },
    [isAuthPage, showPopup]
  );

  // Check upon route change / mount
  useEffect(() => {
    const initial = setTimeout(() => {
      if (!isAuthPage) {
        checkNotifications(true);
      } else {
        hasCheckedLoginPopup.current = false;
        knownNotificationIds.current.clear();
        dismissPopup();
      }
    }, 0);
    return () => clearTimeout(initial);
  }, [location.pathname, isAuthPage, checkNotifications, dismissPopup]);

  // Share the existing 15-second refresh with the bell.
  useEffect(() => {
    if (isAuthPage) return;
    return notificationService.subscribe(() => {
      if (hasCheckedLoginPopup.current) checkNotifications(false);
    });
  }, [isAuthPage, checkNotifications]);

  // Listen to manual dispatch if triggered from UI
  useEffect(() => {
    const handleCustomTrigger = (event) => {
      if (event && event.detail) {
        showPopup(event.detail);
      }
    };
    window.addEventListener("show-notification-popup", handleCustomTrigger);
    return () => window.removeEventListener("show-notification-popup", handleCustomTrigger);
  }, [showPopup]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  if (!popupData || isAuthPage) return null;

  const handleOpenInbox = () => {
    dismissPopup();
    navigate("/notifications");
  };

  // Helper to format mention messages cleanly matching the screenshot
  const renderMessageContent = (msg) => {
    if (!msg) return null;
    const mentionRegex = /^(.*mentioned you\s*:?)\s*["“]?([^"“”]+)["”]?$/i;
    const match = typeof msg === "string" ? msg.match(mentionRegex) : null;
    if (match) {
      return (
        <div>
          <div>{match[1].trim()} :</div>
          <div className="mt-[2px]!">“{match[2].trim()}”</div>
        </div>
      );
    }
    return <div className="[white-space:pre-line]!">{msg}</div>;
  };

  return (
    <div
      className="fixed! top-[24px]! right-[24px]! z-[999999]! [font-family:-apple-system,_BlinkMacSystemFont,_'Segoe_UI',_Roboto,_Helvetica,_Arial,_sans-serif]!" style={{
  pointerEvents: isVisible ? "auto" : "none"
}}
    >

      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`w-[390px]! max-w-[calc(100vw_-_32px)]! [background-color:var(--color-white)]! rounded-[16px]! [border:1px_solid_var(--color-slate-200)]! [box-shadow:0_10px_25px_-3px_rgba(15,_23,_42,_0.08),_0_4px_6px_-2px_rgba(15,_23,_42,_0.04)]! p-[18px_20px_16px_20px]! box-border! ${isVisible ? 'animate-notification-in' : 'animate-notification-out'}`}
      >
        {/* Header row: "Notification" + "[1 New]" + "✕" */}
        <div
          className="flex! items-center! justify-between!"
        >
          <div
            className="flex! items-center! gap-[10px]!"
          >
            <span
              className="text-[18px]! font-bold! [color:var(--color-slate-900)]! tracking-[-0.01em]!"
            >
              Notification
            </span>
            <span
              className="[background-color:#BAE6FD]! [color:var(--color-slate-900)]! text-[13px]! font-medium! p-[2.5px_12px]! rounded-[9999px]! leading-[1.35]! inline-block!"
            >
              {popupData.badge || (popupData.count ? `${popupData.count} New` : "1 New")}
            </span>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              dismissPopup();
            }}
            className={"[background:transparent]! border-0! cursor-pointer! [color:var(--color-slate-900)]! text-[18px]! leading-[1]! p-[4px]! flex! items-center! justify-center! rounded-[4px]! [transition:opacity_0.15s_ease]!" + ' ' + "hover:opacity-[0.6]!"}
            title="Close"

          >
            ✕
          </button>
        </div>

        {/* Subtitle: "You have 1 new notification" */}
        <div
          className="text-[16px]! font-bold! [color:var(--color-slate-900)]! mt-[14px]! mb-[6px]! leading-[1.3]!"
        >
          {popupData.title ||
            `You have ${popupData.count || 1} new notification${
              (popupData.count || 1) > 1 ? "s" : ""
            }`}
        </div>

        {/* Notification Message Details */}
        <div
          className="text-[14px]! [color:var(--color-slate-900)]! leading-[1.45]! [word-break:break-word]!"
        >
          {renderMessageContent(popupData.message)}
        </div>

        {/* Divider Line */}
        <div
          className="h-[1px]! [background-color:var(--color-slate-200)]! m-[16px_0_12px_0]!"
        />

        {/* Full-width Action Button: "Open notification inbox →" */}
        <button
          type="button"
          onClick={handleOpenInbox}
          className={"w-full! p-[11px_16px]! [background-color:var(--color-slate-100)]! [color:var(--color-slate-900)]! rounded-[10px]! border-0! cursor-pointer! flex! items-center! justify-center! gap-[8px]! text-[15px]! font-semibold! [transition:background-color_0.15s_ease,_transform_0.1s_ease]! box-border!" + ' ' + "hover:[background-color:var(--color-slate-200)]!"}

        >
          <span>Open notification inbox</span>
          <span className="text-[16px]! font-normal!">→</span>
        </button>
      </div>
    </div>
  );
}
