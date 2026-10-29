import { useState, useEffect, useMemo } from 'react';
import { notificationService } from './notificationService.js';
import useNotificationNavigation from './useNotificationNavigation.js';
import { apiRequest, errorMessage } from '../../shared/api/apiClient.js';

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
  const { openNotification, feedback, toast } = useNotificationNavigation();
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'assigned' | 'mentions'
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [preferences, setPreferences] = useState(null);
  const [savingPreference, setSavingPreference] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest('/notifications/preferences/', { signal: controller.signal }).then(setPreferences).catch(() => {});
    return () => controller.abort();
  }, []);
  const changePreference = async event => {
    setSavingPreference(true);
    try { setPreferences(await apiRequest('/notifications/preferences/', { method: 'PATCH', body: { notify_task_status: event.target.checked } })); }
    catch (error) { toast.error(errorMessage(error)); }
    finally { setSavingPreference(false); }
  };

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
    const unsubscribe = notificationService.subscribe(() => fetchNotifications());
    return () => {
      isMounted = false;
      unsubscribe();
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
      className={"notification-view-container" + " " + "flex! flex-col! items-start! p-[18px_20px]! gap-[8px]! [background:var(--color-white)]! rounded-[12px]! [border:1px_solid_var(--color-slate-200)]! [box-shadow:0_1px_3px_rgba(0,_0,_0,_0.02),_0_1px_2px_rgba(0,_0,_0,_0.03)]! max-w-[100%]! w-full! box-border! [font-family:'Inter',_sans-serif]!"}

    >
      {/* ── Header Section ── */}
      {feedback}
      {preferences && <label className="flex! items-center! gap-2! text-[13px]! self-end!">
        <input type="checkbox" checked={preferences.notify_task_status} disabled={savingPreference} onChange={changePreference} />
        Task status notifications
      </label>}
      <div className="w-full! mb-[4px]! flex! justify-between! items-start!">
        <div>
          <h1
            className="text-[20px]! font-bold! [color:var(--color-slate-900)]! m-[0_0_4px_0]! leading-[28px]! tracking-[-0.01em]!"
          >
            Notifications
          </h1>
          <p
            className="text-[13px]! [color:var(--color-slate-500)]! m-0! font-normal! leading-[18px]!"
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
            className={"[background:none]! border-0! [color:var(--color-primary)]! text-[13px]! font-semibold! cursor-pointer! p-[4px_2px]! [font-family:inherit]! whitespace-nowrap! mt-[4px]!" + ' ' + "hover:underline!"}

          >
            Mark all read
          </button>
        )}
      </div>

      {/* ── Tabs Navigation Bar ── */}
      <div
        className="flex! items-center! gap-[28px]! w-full! [border-bottom:1px_solid_var(--color-slate-200)]! box-border! pb-[0px]! mt-[6px]! mb-[6px]!"
      >
        {/* Tab 1: All */}
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className="[background:none]! border-0! outline-none! cursor-pointer! flex! items-center! gap-[8px]! p-[8px_2px_10px_2px]! text-[13.5px]! mb-[-1px]! [transition:all_0.15s_ease]!" style={{
  fontWeight: activeTab === "all" ? "600" : "500",
  color: activeTab === "all" ? "var(--color-primary)" : "var(--color-slate-600)",
  borderBottom: activeTab === "all" ? "2.5px solid var(--color-primary)" : "2.5px solid transparent"
}}
        >
          <span>All</span>
          <span
            className="rounded-[12px]! p-[2px_7px]! text-[11px]! font-semibold! leading-[14px]!" style={{
  backgroundColor: activeTab === "all" ? "var(--color-primary-subtle)" : "var(--color-slate-100)",
  color: activeTab === "all" ? "var(--color-primary)" : "var(--color-slate-500)"
}}
          >
            {allCount}
          </span>
        </button>

        {/* Tab 2: Assigned to me */}
        <button
          type="button"
          onClick={() => setActiveTab("assigned")}
          className="[background:none]! border-0! outline-none! cursor-pointer! flex! items-center! gap-[8px]! p-[8px_2px_10px_2px]! text-[13.5px]! mb-[-1px]! [transition:all_0.15s_ease]!" style={{
  fontWeight: activeTab === "assigned" ? "600" : "500",
  color: activeTab === "assigned" ? "var(--color-primary)" : "var(--color-slate-600)",
  borderBottom: activeTab === "assigned" ? "2.5px solid var(--color-primary)" : "2.5px solid transparent"
}}
        >
          <span>Assigned to me</span>
          <span
            className="rounded-[12px]! p-[2px_7px]! text-[11px]! font-semibold! leading-[14px]!" style={{
  backgroundColor: activeTab === "assigned" ? "var(--color-primary-subtle)" : "var(--color-slate-100)",
  color: activeTab === "assigned" ? "var(--color-primary)" : "var(--color-slate-500)"
}}
          >
            {assignedCount}
          </span>
        </button>

        {/* Tab 3: Mentions */}
        <button
          type="button"
          onClick={() => setActiveTab("mentions")}
          className="[background:none]! border-0! outline-none! cursor-pointer! flex! items-center! gap-[8px]! p-[8px_2px_10px_2px]! text-[13.5px]! mb-[-1px]! [transition:all_0.15s_ease]!" style={{
  fontWeight: activeTab === "mentions" ? "600" : "500",
  color: activeTab === "mentions" ? "var(--color-primary)" : "var(--color-slate-600)",
  borderBottom: activeTab === "mentions" ? "2.5px solid var(--color-primary)" : "2.5px solid transparent"
}}
        >
          <span>Mentions</span>
          <span
            className="rounded-[12px]! p-[2px_7px]! text-[11px]! font-semibold! leading-[14px]!" style={{
  backgroundColor: activeTab === "mentions" ? "var(--color-primary-subtle)" : "var(--color-slate-100)",
  color: activeTab === "mentions" ? "var(--color-primary)" : "var(--color-slate-500)"
}}
          >
            {mentionsCount}
          </span>
        </button>
      </div>

      {/* ── Notification Groups by Section ── */}
      <div className="w-full! flex! flex-col! gap-[10px]!">
        {loading ? (
          <div
            className="p-[36px_16px]! text-center! [color:var(--color-slate-500)]! text-[14px]!"
          >
            Loading notifications...
          </div>
        ) : Object.keys(groupedSections).length === 0 ? (
          <div
            className="p-[36px_16px]! text-center! [color:var(--color-slate-400)]! text-[14px]!"
          >
            {loadError ? 'Unable to load notifications. Please try again.' : 'No notifications found in this view.'}
          </div>
        ) : (
          Object.entries(groupedSections).map(([sectionName, items]) => (
            <div key={sectionName} className="w-full!">
              {/* Section Header Row */}
              <div
                className="w-full! [background-color:var(--color-slate-50)]! p-[7px_12px]! rounded-[4px]! box-border! mb-[6px]!" style={{
  marginTop: sectionName === "YESTERDAY" ? "8px" : "2px"
}}
              >
                <span
                  className="text-[11px]! font-bold! tracking-[0.06em]! [color:var(--color-slate-500)]! [text-transform:uppercase]!"
                >
                  {sectionName}
                </span>
              </div>

              {/* Section Item Rows */}
              <div className="flex! flex-col! gap-[4px]!">
                {items.map((item) => {
                  const isBgBlue = item.isHighlighted;
                  return (
                    <div
                      key={item.id}
                      onClick={() => openNotification(item.id)}
                      className={"flex! items-start! gap-[12px]! p-[11px_14px]! rounded-[4px]! [transition:background-color_0.15s_ease]! cursor-pointer! box-border! w-full!" + ' ' + (!isBgBlue ? "hover:[background-color:var(--color-slate-50)]!" : '')} style={{
  backgroundColor: isBgBlue ? "#edf5ff" : "var(--color-white)"
}}

                    >
                      {/* Left Dot Indicator */}
                      <div
                        className="w-[6px]! h-[6px]! rounded-[50%]! mt-[6px]! shrink-0!" style={{
  backgroundColor: item.isBlocking ? "var(--color-danger)" : "var(--color-primary)"
}}
                      />

                      {/* Content Section */}
                      <div className="flex-1! min-w-0!">
                        {/* Text Line */}
                        <div
                          className="text-[13.5px]! [color:var(--color-slate-800)]! leading-[1.45]! font-normal!"
                        >
                          <strong className="font-bold! [color:var(--color-slate-900)]!">
                            {item.sender}
                          </strong>{" "}
                          {item.action}{" "}
                          <strong className="font-bold! [color:var(--color-slate-900)]!">
                            {item.target}
                          </strong>{" "}
                          {item.suffix}
                        </div>

                        {/* Metadata row (Project & Timestamp) */}
                        <div
                          className="flex! items-center! gap-[14px]! mt-[3px]! text-[12px]! [color:var(--color-slate-400)]!"
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
