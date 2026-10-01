import { useState, useEffect, useMemo } from 'react';
import { notificationService } from './notificationService.js';

function getTimeAgo(timestamp) {
  if (!timestamp) return "Just now";
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function getSectionCategory(timestamp) {
  if (!timestamp) return "TODAY";
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date >= today) return "TODAY";
  if (date >= yesterday) return "YESTERDAY";
  return "EARLIER";
}

export default function NotificationView({ searchQuery = "" }) {
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'assigned' | 'mentions'
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Fetch live notifications from backend API
  useEffect(() => {
    let isMounted = true;
    async function fetchNotifications(showLoading = false) {
      if (showLoading) setLoading(true);
      try {
        const data = await notificationService.getNotifications();
        if (isMounted) setLoadError(false);
        if (isMounted && Array.isArray(data)) {
          const formatted = data.map((n, idx) => ({
            id: n.id || `notif-live-${idx}`,
            section: getSectionCategory(n.timestamp),
            sender: n.title || "System",
            action: n.message || "",
            target: "",
            suffix: n.sprint ? `Sprint: ${n.sprint}` : "",
            project: n.project || "Unknown Project",
            timeAgo: getTimeAgo(n.timestamp),
            isHighlighted: !n.is_read,
            isRead: Boolean(n.is_read),
            isBlocking: n.priority === "high" || n.type?.includes("overdue"),
            type: n.type?.includes("mention") ? "mention" : "assigned",
          }));
          setNotifications(formatted);
        }
      } catch (err) {
        if (isMounted) setLoadError(true);
        console.warn("Could not load notifications:", err);
      } finally {
        if (isMounted && showLoading) setLoading(false);
      }
    }
    fetchNotifications(true);
    const interval = setInterval(() => fetchNotifications(), 30000);
    const handleChange = () => fetchNotifications();
    window.addEventListener('notifications:changed', handleChange);
    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('notifications:changed', handleChange);
    };
  }, []);

  // Tab counts
  const allCount = notifications.length;
  const assignedCount = notifications.filter(
    (n) => n.type === "assigned"
  ).length;
  const mentionsCount = notifications.filter(
    (n) => n.type === "mention"
  ).length;

  // Unread count
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead || n.isHighlighted).length,
    [notifications]
  );

  // Filtered notifications based on active tab and search query
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      // Tab filter
      if (activeTab === "assigned" && notif.type !== "assigned") return false;
      if (activeTab === "mentions" && notif.type !== "mention") return false;

      // Search filter
      if (searchQuery && searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchesText =
          notif.sender.toLowerCase().includes(q) ||
          notif.action.toLowerCase().includes(q) ||
          notif.target.toLowerCase().includes(q) ||
          notif.project.toLowerCase().includes(q);
        if (!matchesText) return false;
      }

      return true;
    });
  }, [notifications, activeTab, searchQuery]);

  // Group filtered notifications by section (e.g. TODAY, YESTERDAY)
  const groupedSections = useMemo(() => {
    const groups = {};
    filteredNotifications.forEach((n) => {
      const sec = n.section || "TODAY";
      if (!groups[sec]) {
        groups[sec] = [];
      }
      groups[sec].push(n);
    });
    return groups;
  }, [filteredNotifications]);

  const toggleItemHighlight = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((item) => item.id === id ? { ...item, isHighlighted: false, isRead: true } : item)
      );
    } catch (err) {
      console.warn("Error marking notification read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, isHighlighted: false, isRead: true }))
      );
    } catch (err) {
      console.warn("Error marking all read:", err);
    }
  };

  return (
    <div
      className="notification-view-container"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        padding: "18px 20px",
        gap: "8px",
        background: "var(--color-white)",
        borderRadius: "12px",
        border: "1px solid var(--color-slate-200)",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02), 0 1px 2px rgba(0, 0, 0, 0.03)",
        maxWidth: "100%",
        width: "100%",
        boxSizing: "border-box",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* ── Header Section ── */}
      <div style={{ width: "100%", marginBottom: "4px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1
            style={{
              fontSize: "20px",
              fontWeight: "700",
              color: "var(--color-slate-900)",
              margin: "0 0 4px 0",
              lineHeight: "28px",
              letterSpacing: "-0.01em",
            }}
          >
            Notifications
          </h1>
          <p
            style={{
              fontSize: "13px",
              color: "var(--color-slate-500)",
              margin: 0,
              fontWeight: "400",
              lineHeight: "18px",
            }}
          >
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "All caught up — no unread notifications"}
          </p>
        </div>
        {unreadCount > 0 && (
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
              whiteSpace: "nowrap",
              marginTop: "4px",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
            onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* ── Tabs Navigation Bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "28px",
          width: "100%",
          borderBottom: "1px solid var(--color-slate-200)",
          boxSizing: "border-box",
          paddingBottom: "0px",
          marginTop: "6px",
          marginBottom: "6px",
        }}
      >
        {/* Tab 1: All */}
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          style={{
            background: "none",
            border: "none",
            outline: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 2px 10px 2px",
            fontSize: "13.5px",
            fontWeight: activeTab === "all" ? "600" : "500",
            color: activeTab === "all" ? "var(--color-primary)" : "var(--color-slate-600)",
            borderBottom: activeTab === "all" ? "2.5px solid var(--color-primary)" : "2.5px solid transparent",
            marginBottom: "-1px",
            transition: "all 0.15s ease",
          }}
        >
          <span>All</span>
          <span
            style={{
              backgroundColor: activeTab === "all" ? "var(--color-primary-subtle)" : "var(--color-slate-100)",
              color: activeTab === "all" ? "var(--color-primary)" : "var(--color-slate-500)",
              borderRadius: "12px",
              padding: "2px 7px",
              fontSize: "11px",
              fontWeight: "600",
              lineHeight: "14px",
            }}
          >
            {allCount}
          </span>
        </button>

        {/* Tab 2: Assigned to me */}
        <button
          type="button"
          onClick={() => setActiveTab("assigned")}
          style={{
            background: "none",
            border: "none",
            outline: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 2px 10px 2px",
            fontSize: "13.5px",
            fontWeight: activeTab === "assigned" ? "600" : "500",
            color: activeTab === "assigned" ? "var(--color-primary)" : "var(--color-slate-600)",
            borderBottom: activeTab === "assigned" ? "2.5px solid var(--color-primary)" : "2.5px solid transparent",
            marginBottom: "-1px",
            transition: "all 0.15s ease",
          }}
        >
          <span>Assigned to me</span>
          <span
            style={{
              backgroundColor: activeTab === "assigned" ? "var(--color-primary-subtle)" : "var(--color-slate-100)",
              color: activeTab === "assigned" ? "var(--color-primary)" : "var(--color-slate-500)",
              borderRadius: "12px",
              padding: "2px 7px",
              fontSize: "11px",
              fontWeight: "600",
              lineHeight: "14px",
            }}
          >
            {assignedCount}
          </span>
        </button>

        {/* Tab 3: Mentions */}
        <button
          type="button"
          onClick={() => setActiveTab("mentions")}
          style={{
            background: "none",
            border: "none",
            outline: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 2px 10px 2px",
            fontSize: "13.5px",
            fontWeight: activeTab === "mentions" ? "600" : "500",
            color: activeTab === "mentions" ? "var(--color-primary)" : "var(--color-slate-600)",
            borderBottom: activeTab === "mentions" ? "2.5px solid var(--color-primary)" : "2.5px solid transparent",
            marginBottom: "-1px",
            transition: "all 0.15s ease",
          }}
        >
          <span>Mentions</span>
          <span
            style={{
              backgroundColor: activeTab === "mentions" ? "var(--color-primary-subtle)" : "var(--color-slate-100)",
              color: activeTab === "mentions" ? "var(--color-primary)" : "var(--color-slate-500)",
              borderRadius: "12px",
              padding: "2px 7px",
              fontSize: "11px",
              fontWeight: "600",
              lineHeight: "14px",
            }}
          >
            {mentionsCount}
          </span>
        </button>
      </div>

      {/* ── Notification Groups by Section ── */}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
        {loading ? (
          <div
            style={{
              padding: "36px 16px",
              textAlign: "center",
              color: "var(--color-slate-500)",
              fontSize: "14px",
            }}
          >
            Loading notifications...
          </div>
        ) : Object.keys(groupedSections).length === 0 ? (
          <div
            style={{
              padding: "36px 16px",
              textAlign: "center",
              color: "var(--color-slate-400)",
              fontSize: "14px",
            }}
          >
            {loadError ? 'Unable to load notifications. Please try again.' : 'No notifications found in this view.'}
          </div>
        ) : (
          Object.entries(groupedSections).map(([sectionName, items]) => (
            <div key={sectionName} style={{ width: "100%" }}>
              {/* Section Header Row */}
              <div
                style={{
                  width: "100%",
                  backgroundColor: "var(--color-slate-50)",
                  padding: "7px 12px",
                  borderRadius: "4px",
                  boxSizing: "border-box",
                  marginBottom: "6px",
                  marginTop: sectionName === "YESTERDAY" ? "8px" : "2px",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    letterSpacing: "0.06em",
                    color: "var(--color-slate-500)",
                    textTransform: "uppercase",
                  }}
                >
                  {sectionName}
                </span>
              </div>

              {/* Section Item Rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {items.map((item) => {
                  const isBgBlue = item.isHighlighted;
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleItemHighlight(item.id)}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        padding: "11px 14px",
                        borderRadius: "4px",
                        backgroundColor: isBgBlue ? "#edf5ff" : "var(--color-white)",
                        transition: "background-color 0.15s ease",
                        cursor: "pointer",
                        boxSizing: "border-box",
                        width: "100%",
                      }}
                      onMouseEnter={(e) => {
                        if (!isBgBlue) {
                          e.currentTarget.style.backgroundColor = "var(--color-slate-50)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isBgBlue) {
                          e.currentTarget.style.backgroundColor = "var(--color-white)";
                        }
                      }}
                    >
                      {/* Left Dot Indicator */}
                      <div
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          backgroundColor: item.isBlocking ? "var(--color-danger)" : "var(--color-primary)",
                          marginTop: "6px",
                          flexShrink: 0,
                        }}
                      />

                      {/* Content Section */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Text Line */}
                        <div
                          style={{
                            fontSize: "13.5px",
                            color: "var(--color-slate-800)",
                            lineHeight: "1.45",
                            fontWeight: "400",
                          }}
                        >
                          <strong style={{ fontWeight: "700", color: "var(--color-slate-900)" }}>
                            {item.sender}
                          </strong>{" "}
                          {item.action}{" "}
                          <strong style={{ fontWeight: "700", color: "var(--color-slate-900)" }}>
                            {item.target}
                          </strong>{" "}
                          {item.suffix}
                        </div>

                        {/* Metadata row (Project & Timestamp) */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "14px",
                            marginTop: "3px",
                            fontSize: "12px",
                            color: "var(--color-slate-400)",
                          }}
                        >
                          <span>{item.project}</span>
                          <span>{item.timeAgo}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


