import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiList, errorMessage } from '../../services/api/apiClient.js';
import { ProjectSelectionContext } from '../projects/projectSelectionContext.js';
// ── Helpers ──────────────────────────────────────────────────────────

/** Derive a workload status label from a 0-100 percentage. */
function deriveStatus(pct) {
  if (pct >= 80) return "Overloaded";
  if (pct >= 50) return "Balanced";
  if (pct >= 20) return "Underloaded";
  return "Idle";
}

/** Return initials (up to 2 chars) from a full name string. */
function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Format a Due_Date string to a human-readable label. */
function formatDueLabel(dueDateStr) {
  if (!dueDateStr) return "No due date";
  const due = new Date(dueDateStr);
  if (isNaN(due.getTime())) return "No due date";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due - today) / 86400000);
  if (diff < 0) return `due Overdue`;
  if (diff === 0) return `due Today`;
  if (diff === 1) return `due Tomorrow`;
  const day = due.toLocaleDateString("en-US", { weekday: "short" });
  return `due ${day}`;
}

/** Map task Status to badge colours and labels. */
function getTaskStatusStyle(rawStatus = "") {
  const s = (rawStatus || "").toLowerCase().replace(/_/g, " ").trim();
  if (s.includes("progress")) {
    return { label: "In progress", color: "var(--color-primary)", bg: "var(--color-primary-subtle)", dot: "var(--color-primary)" };
  }
  if (s.includes("block")) {
    return { label: "Blocked", color: "var(--color-danger-dark)", bg: "var(--color-danger-border)", dot: "var(--color-danger)" };
  }
  if (s.includes("review")) {
    return { label: "Review", color: "var(--color-primary)", bg: "var(--color-primary-subtle)", dot: "var(--color-primary)" };
  }
  if (s.includes("done") || s.includes("complete")) {
    return { label: "Completed", color: "var(--color-success-dark)", bg: "var(--color-success-bg)", dot: "var(--color-success-alt)" };
  }
  return { label: "To do", color: "var(--color-primary)", bg: "var(--color-primary-subtle)", dot: "var(--color-success-alt)" };
}

/** Get realistic/actual task hours formatted as e.g. "12h" */
function getTaskHours(task) {
  if (task?.Time_Taken) {
    const parts = String(task.Time_Taken).split(":");
    if (parts.length >= 1 && parseInt(parts[0], 10) > 0) {
      return `${parseInt(parts[0], 10)}h`;
    }
  }
  return "0h";
}

/** Avatar background colours – cycle through a small palette by index. */
const AVATAR_COLORS = [
  "var(--color-primary)", "#7c3aed", "#db2777", "var(--color-role-pm-dark)",
  "#16a34a", "#0891b2", "#9333ea", "var(--color-danger-dark)",
];
function avatarColor(idx) {
  return AVATAR_COLORS[idx % AVATAR_COLORS.length];
}

const PAGE_SIZE = 10;

// ── Component ─────────────────────────────────────────────────────────

export default function WorkloadPage() {
  const navigate = useNavigate();
  const { projects, selectedProjectId: selectedMainProjectId } = useContext(ProjectSelectionContext);
  const selectedMainProject = projects.find(project => project.id === selectedMainProjectId)?.project_name || '';
  const [workloadData, setWorkloadData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchWorkload = useCallback(async ({ signal } = {}) => {
    if (!selectedMainProjectId || selectedMainProjectId === 'all') { setWorkloadData([]); return; }
    setLoading(true); setError(null);
    try {
      const users = await apiList(`/projects/${selectedMainProjectId}/users/workload/`, { signal });
      setWorkloadData(users.map(user => ({ id: user.id,
        name: `${user.first_name} ${user.last_name}`.trim() || user.user_name,
        username: user.user_name, designation: user.designation, department: user.department,
        load: user.availability.workload_percent, status: deriveStatus(user.availability.workload_percent),
        taskAssign: `${user.availability.busy_days + user.availability.half_days} task day(s) / week`, availData: user.availability })));
    } catch (error) { if (!signal?.aborted) { setError(errorMessage(error)); setWorkloadData([]); } }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [selectedMainProjectId]);
  // Synchronize capacity with the selected project.
  useEffect(() => {
    const controller = new AbortController();
    // Starting an external request also updates its loading indicator.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWorkload({ signal: controller.signal });
    return () => controller.abort();
  }, [fetchWorkload]);
  // ── Search, Filter, Sort, Pagination ──────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredData = workloadData
    .filter((u) => {
      const q = (searchQuery || "").trim().toLowerCase();
      const matchSearch =
        !q ||
        (u.name || "").toLowerCase().includes(q) ||
        (u.username || "").toLowerCase().includes(q) ||
        (u.role || "").toLowerCase().includes(q) ||
        (u.department || "").toLowerCase().includes(q) ||
        (u.status || "").toLowerCase().includes(q);
      const matchPill = activeFilter === "All" || u.status === activeFilter;
      return matchSearch && matchPill;
    })
    .sort((a, b) => (sortAsc ? a.load - b.load : b.load - a.load));

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedData = filteredData.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE
  );

  // Reset to page 1 when filter/search changes


  const counts = {
    All: workloadData.length,
    Overloaded: workloadData.filter((u) => u.status === "Overloaded").length,
    Balanced: workloadData.filter((u) => u.status === "Balanced").length,
    Underloaded: workloadData.filter((u) => u.status === "Underloaded").length,
    Idle: workloadData.filter((u) => u.status === "Idle").length,
  };

  // ── Modal ──────────────────────────────────────────────────────────
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTasks, setModalTasks] = useState([]);
  const [modalTasksLoading, setModalTasksLoading] = useState(false);

  const openModal = async (row) => {
    setSelectedUser(row);
    setIsModalOpen(true);
    setModalTasks([]);
    setModalTasksLoading(true);
    try {
      const monday = new Date();
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
      const date = value => new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      const tasks = await apiList(`/tasks/?assigned_to=${row.id}&project=${selectedMainProjectId}&due_date_from=${date(monday)}&due_date_to=${date(sunday)}`);
      setModalTasks(tasks);
    } catch (e) {
      console.error("Failed to fetch user tasks:", e);
    } finally {
      setModalTasksLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setModalTasks([]);
  };

  // ── Status badge styles ────────────────────────────────────────────
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "Overloaded":
        return { backgroundColor: "var(--color-danger-bg)", color: "var(--color-danger-dark)", dotColor: "var(--color-danger)", barColor: "var(--color-danger-dark)" };
      case "Balanced":
        return { backgroundColor: "var(--color-success-bg)", color: "var(--color-success-dark)", dotColor: "var(--color-success-alt)", barColor: "var(--color-success-alt)" };
      case "Underloaded":
        return { backgroundColor: "var(--color-warning-bg)", color: "var(--color-warning-dark)", dotColor: "var(--color-warning)", barColor: "var(--color-warning)" };
      case "Idle":
      default:
        return { backgroundColor: "var(--color-slate-100)", color: "var(--color-slate-600)", dotColor: "var(--color-slate-400)", barColor: "var(--color-slate-400)" };
    }
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div style={{ width: "100%", fontFamily: "Inter, sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }

        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined';
          font-weight: normal;
          font-style: normal;
          font-size: 24px;
          line-height: 1;
          letter-spacing: normal;
          text-transform: none;
          display: inline-block;
          white-space: nowrap;
          word-wrap: normal;
          direction: ltr;
          -webkit-font-smoothing: antialiased;
        }
        .table-row-hover:hover { background-color: var(--color-slate-50) !important; }
        .wl-page-btn:hover:not(:disabled) { background-color: var(--color-slate-100); }
        @keyframes wl-spin {
          to { transform: rotate(360deg); }
        }
        .wl-spinner {
          display: inline-block;
          width: 20px; height: 20px;
          border: 2px solid var(--color-slate-200);
          border-top-color: var(--color-primary);
          border-radius: 50%;
          animation: wl-spin 0.7s linear infinite;
        }

        /* Right-side page scrollbar */
        .wl-scroll-canvas {
          scrollbar-width: thin;
          scrollbar-color: var(--color-slate-300) var(--color-slate-100);
        }
        .wl-scroll-canvas::-webkit-scrollbar {
          width: 8px;
        }
        .wl-scroll-canvas::-webkit-scrollbar-track {
          background: var(--color-slate-100);
        }
        .wl-scroll-canvas::-webkit-scrollbar-thumb {
          background: var(--color-slate-300);
          border-radius: 4px;
        }
        .wl-scroll-canvas::-webkit-scrollbar-thumb:hover {
          background: var(--color-slate-400);
        }

        /* Table card right-side scrollbar */
        .wl-table-scroll {
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: var(--color-slate-300) var(--color-slate-50);
        }
        .wl-table-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .wl-table-scroll::-webkit-scrollbar-track {
          background: var(--color-slate-50);
          border-top-right-radius: 12px;
          border-bottom-right-radius: 12px;
        }
        .wl-table-scroll::-webkit-scrollbar-thumb {
          background: var(--color-slate-300);
          border-radius: 4px;
        }
        .wl-table-scroll::-webkit-scrollbar-thumb:hover {
          background: var(--color-slate-400);
        }

        /* Slide-over Drawer animation */
        @keyframes wl-slide-in {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .wl-drawer-panel {
          animation: wl-slide-in 0.28s cubic-bezier(0.16, 1, 0.3, 1);
          scrollbar-width: thin;
          scrollbar-color: var(--color-slate-300) var(--color-white);
        }
        .wl-drawer-panel::-webkit-scrollbar {
          width: 6px;
        }
        .wl-drawer-panel::-webkit-scrollbar-track {
          background: var(--color-white);
        }
        .wl-drawer-panel::-webkit-scrollbar-thumb {
          background: var(--color-slate-300);
          border-radius: 3px;
        }
      `}</style>

      <div style={{ width: "100%", minWidth: 0 }}>
        {/* Content Body */}
        <div style={styles.contentBody}>
          {/* Title */}
          <div style={styles.titleSection}>
            <h1 style={styles.pageTitle}>Team Workload</h1>
            <p style={styles.pageSubtitle}>
              Current week capacity based on scheduled task points in this project.
            </p>
          </div>

          {/* Filters & Actions Row */}
          <div style={styles.filtersBar}>
            {/* Status Pills */}
            <div style={styles.pillsContainer}>
              {["All", "Overloaded", "Balanced", "Underloaded", "Idle"].map((pill) => {
                const isActive = activeFilter === pill;
                return (
                  <button
                    key={pill}
                    onClick={() => setActiveFilter(pill)}
                    style={{
                      ...styles.pillBtn,
                      backgroundColor: isActive ? "var(--color-slate-900)" : "var(--color-white)",
                      color: isActive ? "var(--color-white)" : "var(--color-slate-600)",
                      borderColor: isActive ? "var(--color-slate-900)" : "var(--color-slate-300)",
                    }}
                  >
                    {pill}
                    <span
                      style={{
                        ...styles.pillCountBadge,
                        backgroundColor: isActive ? "var(--color-slate-700)" : "var(--color-slate-100)",
                        color: isActive ? "var(--color-white)" : "var(--color-slate-600)",
                      }}
                    >
                      {counts[pill]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search & Sort */}
            <div style={styles.rightFilters}>
              <div style={styles.innerSearchWrapper}>
                <span className="material-symbols-outlined" style={styles.innerSearchIcon}>
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search name or role"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  style={styles.innerSearchInput}
                />
              </div>
              <button onClick={() => setSortAsc(!sortAsc)} style={styles.sortBtn}>
                <span className="material-symbols-outlined" style={styles.sortIcon}>
                  swap_vert
                </span>
                Load {sortAsc ? "↑" : "↓"}
              </button>
              <button
                onClick={fetchWorkload}
                style={{ ...styles.sortBtn, gap: "4px" }}
                title="Refresh workload"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "var(--color-slate-500)" }}>
                  refresh
                </span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="wl-table-scroll" style={styles.tableCard}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: "28%" }}>User</th>
                  <th style={{ ...styles.th, width: "15%" }}>Status</th>
                  <th style={{ ...styles.th, width: "32%" }}>Workload</th>
                  <th style={{ ...styles.th, width: "15%" }}>Task Days / Week</th>
                  <th style={{ ...styles.th, width: "10%", textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" style={{ ...styles.emptyCell, padding: "40px" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                        <span className="wl-spinner" />
                        <span style={{ color: "var(--color-slate-400)", fontSize: "13px" }}>Loading workload data…</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="5" style={styles.emptyCell}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                        <span className="material-symbols-outlined" style={{ color: "var(--color-danger)", fontSize: "32px" }}>
                          error_outline
                        </span>
                        <span style={{ color: "var(--color-danger)" }}>{error}</span>
                        <button onClick={fetchWorkload} style={styles.sortBtn}>
                          Retry
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : pagedData.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={styles.emptyCell}>
                      No users match the current filter.
                    </td>
                  </tr>
                ) : (
                  pagedData.map((row, idx) => {
                    const badge = getStatusBadgeStyle(row.status);
                    const globalIdx = (safeCurrentPage - 1) * PAGE_SIZE + idx;
                    return (
                      <tr key={row.id} className="table-row-hover" style={styles.tr}>
                        {/* User cell */}
                        <td style={styles.td}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                backgroundColor: avatarColor(globalIdx),
                                color: "var(--color-white)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: "700",
                                fontSize: "12px",
                                flexShrink: 0,
                              }}
                            >
                              {getInitials(row.name)}
                            </div>
                            <div>
                              <div style={{ fontWeight: "700", color: "var(--color-slate-900)" }}>{row.name}</div>
                              {row.designation && (
                                <div style={{ fontSize: "11px", color: "var(--color-slate-400)", marginTop: "1px" }}>
                                  {row.designation}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Status badge */}
                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.statusBadge,
                              backgroundColor: badge.backgroundColor,
                              color: badge.color,
                            }}
                          >
                            <span
                              style={{ ...styles.statusDot, backgroundColor: badge.dotColor }}
                            />
                            {row.status}
                          </span>
                        </td>

                        {/* Progress bar */}
                        <td style={styles.td}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={styles.progressBarTrack}>
                              <div
                                style={{
                                  ...styles.progressBarFill,
                                  width: `${row.load}%`,
                                  backgroundColor: badge.barColor,
                                  transition: "width 0.4s ease",
                                }}
                              />
                            </div>
                            <span style={{ fontSize: "12px", color: "var(--color-slate-500)", minWidth: "32px", textAlign: "right" }}>
                              {row.load}%
                            </span>
                          </div>
                        </td>

                        {/* Task days */}
                        <td style={{ ...styles.td, color: "var(--color-slate-600)" }}>{row.taskAssign}</td>

                        {/* Action */}
                        <td style={styles.td}>
                          <div style={{ display: "flex", justifyContent: "center" }}>
                            <button
                              style={styles.actionBtn}
                              title="View Capacity"
                              onClick={() => openModal(row)}
                            >
                              <span className="material-symbols-outlined" style={styles.actionIcon}>
                                visibility
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Alert Banner */}
          <div style={styles.alertBanner}>
            <span className="material-symbols-outlined" style={styles.alertIcon}>
              info
            </span>
            <span style={styles.alertText}>
              Load is built from task estimates. Tasks waiting for approvals may not be reflected.{" "}
              <span style={styles.alertLink} onClick={() => navigate("/pm/approvals")}>
                Review approvals
              </span>
            </span>
          </div>

          {/* Pagination */}
          {!loading && !error && filteredData.length > 0 && (
            <div style={styles.footerRow}>
              <span style={styles.footerText}>
                Showing {Math.min((safeCurrentPage - 1) * PAGE_SIZE + 1, filteredData.length)}–
                {Math.min(safeCurrentPage * PAGE_SIZE, filteredData.length)} of{" "}
                {filteredData.length} users
              </span>
              <div style={styles.paginationGroup}>
                <button
                  className="wl-page-btn"
                  style={styles.pageBtn}
                  disabled={safeCurrentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <span className="material-symbols-outlined" style={styles.paginationIcon}>
                    chevron_left
                  </span>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === totalPages ||
                      Math.abs(p - safeCurrentPage) <= 1
                  )
                  .reduce((acc, p, i, arr) => {
                    if (i > 0 && p - arr[i - 1] > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, i) =>
                    item === "..." ? (
                      <span key={`ellipsis-${i}`} style={{ padding: "0 4px", color: "var(--color-slate-400)", fontSize: "12px" }}>
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        className="wl-page-btn"
                        onClick={() => setCurrentPage(item)}
                        style={{
                          ...styles.pageBtn,
                          ...(item === safeCurrentPage ? styles.pageBtnActive : {}),
                        }}
                      >
                        {item}
                      </button>
                    )
                  )}
                <button
                  className="wl-page-btn"
                  style={styles.pageBtn}
                  disabled={safeCurrentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  <span className="material-symbols-outlined" style={styles.paginationIcon}>
                    chevron_right
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Slide-over Drawer Panel ─────────────────────────────────── */}
      {isModalOpen && selectedUser && (
        <>
          {/* Backdrop Overlay */}
          <div
            onClick={closeModal}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(15, 23, 42, 0.35)",
              zIndex: 999,
              transition: "opacity 0.25s ease",
            }}
          />

          {/* Right Drawer Panel */}
          <div
            className="wl-drawer-panel"
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "460px",
              maxWidth: "92vw",
              height: "100vh",
              backgroundColor: "var(--color-white)",
              boxShadow: "-8px 0 32px rgba(15, 23, 42, 0.12)",
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
              padding: "32px 28px",
              fontFamily: "'Inter', sans-serif",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Avatar, Name & Subtitle, Close Button */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    backgroundColor: "var(--color-primary)",
                    color: "var(--color-white)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "700",
                    fontSize: "15px",
                    flexShrink: 0,
                  }}
                >
                  {getInitials(selectedUser.name)}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "var(--color-slate-900)", lineHeight: 1.2 }}>
                    {selectedUser.name}
                  </h2>
                  <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--color-slate-500)" }}>
                    {[
                      selectedUser.department || "Design",
                      "Member",
                      selectedUser.designation || "Design",
                    ].join(" · ")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-slate-500)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px",
                  borderRadius: "6px",
                }}
                aria-label="Close"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>close</span>
              </button>
            </div>

            {/* Metric Box (Load, Capacity, Projects) */}
            <div
              style={{
                backgroundColor: "var(--color-primary-subtle)",
                borderRadius: "14px",
                padding: "20px 22px",
                display: "flex",
                flexDirection: "column",
                gap: "18px",
              }}
            >
              <div style={{ display: "flex", gap: "24px", justifyContent: "space-between" }}>
                {/* LOAD */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "10.5px", fontWeight: "700", color: "var(--color-slate-600)", letterSpacing: "0.6px", textTransform: "uppercase" }}>
                    LOAD
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "22px", fontWeight: "700", color: "var(--color-slate-900)" }}>
                      {selectedUser.load}%
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--color-slate-500)" }}>
                      · {modalTasks.length} assigned tasks
                    </span>
                  </div>
                  {/* Progress bar line */}
                  <div
                    style={{
                      height: "3.5px",
                      borderRadius: "2px",
                      backgroundColor: selectedUser.load >= 80 ? "var(--color-danger-dark)" : (selectedUser.load >= 50 ? "var(--color-success-alt)" : "var(--color-warning)"),
                      marginTop: "8px",
                      width: "100%",
                    }}
                  />
                </div>

                {/* CAPACITY */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "10.5px", fontWeight: "700", color: "var(--color-slate-600)", letterSpacing: "0.6px", textTransform: "uppercase" }}>
                    CAPACITY
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "4px" }}>
                    <span style={{ fontSize: "22px", fontWeight: "700", color: "var(--color-slate-900)" }}>
                      {selectedUser.availData?.weekly_capacity ?? 0} points / week
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--color-slate-500)" }}>
                      · full week
                    </span>
                  </div>
                </div>
              </div>

              {/* PROJECTS */}
              <div>
                <div style={{ fontSize: "10.5px", fontWeight: "700", color: "var(--color-slate-600)", letterSpacing: "0.6px", textTransform: "uppercase" }}>
                  PROJECTS
                </div>
                <div style={{ fontSize: "13px", fontWeight: "500", color: "var(--color-slate-800)", marginTop: "4px" }}>
                  {(() => {
                    const projects = Array.from(new Set(modalTasks.map((t) => t.Project_Name).filter(Boolean)));
                    return projects.length > 0 ? projects.join(", ") : (selectedMainProject || "Project");
                  })()}
                </div>
              </div>
            </div>

            {/* Task List Section */}
            <div style={{ marginTop: "12px" }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "var(--color-slate-500)",
                  textTransform: "uppercase",
                  letterSpacing: "0.6px",
                  marginBottom: "18px",
                }}
              >
                {modalTasksLoading
                  ? "THIS WEEK · LOADING ITEMS…"
                  : `THIS WEEK · ${modalTasks.length} ITEMS`}
              </div>

              {modalTasksLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--color-slate-400)", padding: "16px 0" }}>
                  <span className="wl-spinner" />
                  <span style={{ fontSize: "13px" }}>Fetching tasks…</span>
                </div>
              ) : modalTasks.length === 0 ? (
                <p style={{ fontSize: "13px", color: "var(--color-slate-400)" }}>No tasks assigned this week.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {modalTasks.map((task, idx) => {
                    const statusStyle = getTaskStatusStyle(task.status);
                    const dueLabel = formatDueLabel(task.Due_Date);
                    const hoursLabel = getTaskHours(task, idx);
                    const subtitleParts = [
                      task.project_name || "Project",
                      dueLabel || "due Today",
                      task.description && statusStyle.label === "Blocked" ? task.description : null,
                    ].filter(Boolean);

                    return (
                      <div
                        key={task.Id || idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: "12px",
                          paddingBottom: "14px",
                          borderBottom: idx === modalTasks.length - 1 ? "none" : "1px solid var(--color-slate-100)",
                        }}
                      >
                        {/* Left: Dot & Name / Project / Due */}
                        <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", flex: 1, minWidth: 0 }}>
                          <span
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              backgroundColor: statusStyle.dot,
                              marginTop: "5px",
                              flexShrink: 0,
                            }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <h4
                              style={{
                                margin: 0,
                                fontSize: "13.5px",
                                fontWeight: "600",
                                color: "var(--color-slate-900)",
                                lineHeight: "1.3",
                                wordBreak: "break-word",
                              }}
                            >
                              {task.Task_Name || "Untitled Task"}
                            </h4>
                            <p
                              style={{
                                margin: "3px 0 0 0",
                                fontSize: "11.5px",
                                color: "var(--color-slate-500)",
                                lineHeight: "1.4",
                                wordBreak: "break-word",
                              }}
                            >
                              {subtitleParts.map((part, pIdx) => (
                                <React.Fragment key={pIdx}>
                                  {pIdx > 0 && " · "}
                                  <span style={{ color: part.toLowerCase().includes("overdue") ? "var(--color-danger)" : "inherit" }}>
                                    {part}
                                  </span>
                                </React.Fragment>
                              ))}
                            </p>
                          </div>
                        </div>

                        {/* Right: Hours & Status Badge */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                          <span
                            style={{
                              fontSize: "11px",
                              color: "var(--color-slate-500)",
                              backgroundColor: "var(--color-slate-100)",
                              padding: "3px 7px",
                              borderRadius: "5px",
                              fontWeight: "500",
                              minWidth: "26px",
                              textAlign: "center",
                            }}
                          >
                            {hoursLabel}
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              color: statusStyle.color,
                              backgroundColor: statusStyle.bg,
                              padding: "3px 9px",
                              borderRadius: "6px",
                              fontWeight: "600",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {statusStyle.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────

const styles = {
  layoutWrapper: {
    display: "flex",
    minHeight: "100vh",
    maxHeight: "100vh",
    overflow: "hidden",
    backgroundColor: "var(--color-slate-50)",
    fontFamily: "'Inter', sans-serif",
  },
  mainContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    height: "100vh",
    maxHeight: "100vh",
    overflowY: "auto",
  },
  header: {
    height: "50px",
    minHeight: "50px",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 32px",
    backgroundColor: "var(--color-white)",
    borderBottom: "1px solid var(--color-slate-200)",
    position: "sticky",
    top: 0,
    zIndex: 40,
  },
  projectSelectorWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    height: "34px",
    padding: "0 12px",
    border: "1px solid var(--color-slate-200)",
    borderRadius: "8px",
    cursor: "pointer",
    backgroundColor: "var(--color-white)",
    position: "relative",
    userSelect: "none",
    boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
    boxSizing: "border-box",
  },
  projectSelectorText: {
    fontSize: "14px",
    fontWeight: "600",
    color: "var(--color-slate-900)",
  },
  dropdownChevron: {
    fontSize: "18px",
    color: "var(--color-slate-500)",
  },
  dropdownMenu: {
    position: "absolute",
    top: "40px",
    left: 0,
    backgroundColor: "var(--color-white)",
    border: "1px solid var(--color-slate-300)",
    borderRadius: "8px",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
    minWidth: "160px",
    zIndex: 50,
    padding: "4px 0",
  },
  dropdownMenuItem: {
    padding: "8px 12px",
    fontSize: "13px",
    color: "var(--color-slate-700)",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  headerSearchWrapper: {
    position: "relative",
    width: "280px",
  },
  headerSearchIcon: {
    position: "absolute",
    left: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "var(--color-slate-400)",
    fontSize: "18px",
  },
  headerSearchInput: {
    width: "100%",
    height: "34px",
    paddingLeft: "34px",
    paddingRight: "12px",
    border: "1px solid var(--color-slate-200)",
    borderRadius: "8px",
    fontSize: "13px",
    outline: "none",
    color: "var(--color-slate-900)",
    backgroundColor: "var(--color-white)",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  bellWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    width: "34px",
    height: "34px",
    borderRadius: "8px",
    border: "1px solid var(--color-slate-200)",
    backgroundColor: "var(--color-white)",
  },
  bellIcon: { color: "var(--color-slate-600)", fontSize: "20px" },
  bellBadge: {
    position: "absolute",
    top: "6px",
    right: "6px",
    width: "7px",
    height: "7px",
    backgroundColor: "var(--color-danger)",
    borderRadius: "50%",
  },
  profileBadge: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: "var(--color-role-pm)",
    color: "var(--color-white)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "700",
    cursor: "pointer",
    userSelect: "none",
  },
  contentBody: { padding: "32px", flex: 1 },
  titleSection: { marginBottom: "32px" },
  pageTitle: { fontSize: "24px", fontWeight: "700", color: "var(--color-slate-900)", margin: "0 0 4px 0" },
  pageSubtitle: { fontSize: "13px", color: "var(--color-slate-500)", margin: 0, lineHeight: "1.5" },
  filtersBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    gap: "16px",
    flexWrap: "wrap",
  },
  pillsContainer: { display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" },
  pillBtn: {
    display: "flex",
    alignItems: "center",
    padding: "8px 16px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    border: "1px solid",
    outline: "none",
    transition: "all 0.15s ease",
  },
  pillCountBadge: {
    fontSize: "11px",
    padding: "2px 6px",
    borderRadius: "10px",
    marginLeft: "8px",
    fontWeight: "700",
  },
  rightFilters: { display: "flex", alignItems: "center", gap: "12px" },
  innerSearchWrapper: { position: "relative", width: "220px" },
  innerSearchIcon: {
    position: "absolute",
    left: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "var(--color-slate-400)",
    fontSize: "18px",
  },
  innerSearchInput: {
    width: "100%",
    height: "36px",
    paddingLeft: "32px",
    paddingRight: "10px",
    border: "1px solid var(--color-slate-300)",
    borderRadius: "8px",
    fontSize: "13px",
    outline: "none",
    color: "var(--color-slate-800)",
    backgroundColor: "var(--color-white)",
    fontFamily: "inherit",
  },
  sortBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    height: "36px",
    padding: "0 12px",
    border: "1px solid var(--color-slate-300)",
    borderRadius: "8px",
    backgroundColor: "var(--color-white)",
    fontSize: "13px",
    fontWeight: "500",
    color: "var(--color-slate-600)",
    cursor: "pointer",
    outline: "none",
    transition: "all 0.15s ease",
  },
  sortIcon: { fontSize: "18px", color: "var(--color-slate-500)" },
  tableCard: {
    backgroundColor: "var(--color-white)",
    border: "1px solid var(--color-slate-200)",
    borderRadius: "12px",
    overflowY: "auto",
    overflowX: "auto",
    maxHeight: "340px",
    boxShadow: "0 1px 3px 0 rgba(0,0,0,0.05)",
    position: "relative",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" },
  th: {
    padding: "12px 18px",
    backgroundColor: "var(--color-primary-subtle)",
    color: "var(--color-slate-600)",
    fontWeight: "600",
    fontSize: "12px",
    borderBottom: "1px solid var(--color-slate-200)",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  tr: { borderBottom: "1px solid var(--color-slate-100)", transition: "background-color 0.15s ease" },
  td: { padding: "14px 18px", color: "var(--color-slate-900)", verticalAlign: "middle" },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "600",
  },
  statusDot: { width: "6px", height: "6px", borderRadius: "50%" },
  progressBarTrack: {
    flex: 1,
    height: "8px",
    borderRadius: "4px",
    backgroundColor: "var(--color-slate-200)",
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", borderRadius: "4px" },
  actionBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px",
    borderRadius: "6px",
    color: "var(--color-slate-500)",
    transition: "all 0.15s ease",
  },
  actionIcon: { fontSize: "18px" },
  emptyCell: { padding: "32px", textAlign: "center", color: "var(--color-slate-500)", fontSize: "14px" },
  alertBanner: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 16px",
    borderRadius: "8px",
    backgroundColor: "var(--color-primary-subtle)",
    marginTop: "24px",
    border: "1px solid var(--color-primary-border-mid)",
  },
  alertIcon: { color: "var(--color-primary)", fontSize: "20px" },
  alertText: { fontSize: "13px", color: "var(--color-primary-active)" },
  alertLink: {
    fontWeight: "600",
    color: "var(--color-primary)",
    textDecoration: "underline",
    cursor: "pointer",
    marginLeft: "4px",
  },
  footerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "24px",
    padding: "4px 8px",
  },
  footerText: { fontSize: "12px", color: "var(--color-slate-500)" },
  paginationGroup: { display: "flex", alignItems: "center", gap: "6px" },
  pageBtn: {
    width: "32px",
    height: "32px",
    borderRadius: "6px",
    border: "1px solid var(--color-slate-300)",
    backgroundColor: "var(--color-white)",
    color: "var(--color-slate-600)",
    fontSize: "12px",
    fontWeight: "500",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  pageBtnActive: {
    backgroundColor: "var(--color-primary)",
    borderColor: "var(--color-primary)",
    color: "var(--color-white)",
    fontWeight: "600",
  },
  paginationIcon: { fontSize: "16px" },
};
