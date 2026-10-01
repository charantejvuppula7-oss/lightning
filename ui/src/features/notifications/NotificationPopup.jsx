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
        const notifList = await notificationService.getRecentNotifications();
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

  // Background polling every 15 seconds for real-time messages & nudges
  useEffect(() => {
    if (isAuthPage) return;
    const interval = setInterval(() => {
      checkNotifications(false);
    }, 15000);
    return () => clearInterval(interval);
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
          <div style={{ marginTop: "2px" }}>“{match[2].trim()}”</div>
        </div>
      );
    }
    return <div style={{ whiteSpace: "pre-line" }}>{msg}</div>;
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "24px",
        right: "24px",
        zIndex: 999999,
        pointerEvents: isVisible ? "auto" : "none",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <style>{`
        @keyframes notifPopIn {
          from {
            opacity: 0;
            transform: translateY(-16px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes notifPopOut {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(-12px) scale(0.97);
          }
        }
      `}</style>

      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          width: "390px",
          maxWidth: "calc(100vw - 32px)",
          backgroundColor: "var(--color-white)",
          borderRadius: "16px",
          border: "1px solid var(--color-slate-200)",
          boxShadow:
            "0 10px 25px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.04)",
          padding: "18px 20px 16px 20px",
          animation: isVisible
            ? "notifPopIn 0.26s cubic-bezier(0.16, 1, 0.3, 1) forwards"
            : "notifPopOut 0.22s ease-in forwards",
          boxSizing: "border-box",
        }}
      >
        {/* Header row: "Notification" + "[1 New]" + "✕" */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span
              style={{
                fontSize: "18px",
                fontWeight: "700",
                color: "var(--color-slate-900)",
                letterSpacing: "-0.01em",
              }}
            >
              Notification
            </span>
            <span
              style={{
                backgroundColor: "#BAE6FD",
                color: "var(--color-slate-900)",
                fontSize: "13px",
                fontWeight: "500",
                padding: "2.5px 12px",
                borderRadius: "9999px",
                lineHeight: "1.35",
                display: "inline-block",
              }}
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
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--color-slate-900)",
              fontSize: "18px",
              lineHeight: 1,
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "4px",
              transition: "opacity 0.15s ease",
            }}
            title="Close"
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.6")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            ✕
          </button>
        </div>

        {/* Subtitle: "You have 1 new notification" */}
        <div
          style={{
            fontSize: "16px",
            fontWeight: "700",
            color: "var(--color-slate-900)",
            marginTop: "14px",
            marginBottom: "6px",
            lineHeight: "1.3",
          }}
        >
          {popupData.title ||
            `You have ${popupData.count || 1} new notification${
              (popupData.count || 1) > 1 ? "s" : ""
            }`}
        </div>

        {/* Notification Message Details */}
        <div
          style={{
            fontSize: "14px",
            color: "var(--color-slate-900)",
            lineHeight: "1.45",
            wordBreak: "break-word",
          }}
        >
          {renderMessageContent(popupData.message)}
        </div>

        {/* Divider Line */}
        <div
          style={{
            height: "1px",
            backgroundColor: "var(--color-slate-200)",
            margin: "16px 0 12px 0",
          }}
        />

        {/* Full-width Action Button: "Open notification inbox →" */}
        <button
          type="button"
          onClick={handleOpenInbox}
          style={{
            width: "100%",
            padding: "11px 16px",
            backgroundColor: "var(--color-slate-100)",
            color: "var(--color-slate-900)",
            borderRadius: "10px",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontSize: "15px",
            fontWeight: "600",
            transition: "background-color 0.15s ease, transform 0.1s ease",
            boxSizing: "border-box",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-slate-200)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-slate-100)")}
        >
          <span>Open notification inbox</span>
          <span style={{ fontSize: "16px", fontWeight: "400" }}>→</span>
        </button>
      </div>
    </div>
  );
}



