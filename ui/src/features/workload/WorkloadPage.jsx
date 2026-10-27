import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiList, errorMessage } from '../../shared/api/apiClient.js';
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
    <div className="w-full! [font-family:Inter,_sans-serif]!">

      <div className="w-full! min-w-0!">
        {/* Content Body */}
        <div className="p-[32px]! flex-1!">
          {/* Title */}
          <div className="mb-[32px]!">
            <h1 className="text-[24px]! font-bold! [color:var(--color-slate-900)]! m-[0_0_4px_0]!">Team Workload</h1>
            <p className="text-[13px]! [color:var(--color-slate-500)]! m-0! leading-[1.5]!">
              Current week capacity based on scheduled task points in this project.
            </p>
          </div>

          {/* Filters & Actions Row */}
          <div className="flex! justify-between! items-center! mb-[20px]! gap-[16px]! flex-wrap!">
            {/* Status Pills */}
            <div className="flex! gap-[8px]! items-center! flex-wrap!">
              {["All", "Overloaded", "Balanced", "Underloaded", "Idle"].map((pill) => {
                const isActive = activeFilter === pill;
                return (
                  <button
                    key={pill}
                    onClick={() => setActiveFilter(pill)}
                    className="flex! items-center! p-[8px_16px]! rounded-[20px]! text-[13px]! font-semibold! cursor-pointer! [border:1px_solid]! outline-none! [transition:all_0.15s_ease]!" style={{
  backgroundColor: isActive ? "var(--color-slate-900)" : "var(--color-white)",
  color: isActive ? "var(--color-white)" : "var(--color-slate-600)",
  borderColor: isActive ? "var(--color-slate-900)" : "var(--color-slate-300)"
}}
                  >
                    {pill}
                    <span
                      className="text-[11px]! p-[2px_6px]! rounded-[10px]! ml-[8px]! font-bold!" style={{
  backgroundColor: isActive ? "var(--color-slate-700)" : "var(--color-slate-100)",
  color: isActive ? "var(--color-white)" : "var(--color-slate-600)"
}}
                    >
                      {counts[pill]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search & Sort */}
            <div className="flex! items-center! gap-[12px]!">
              <div className="relative! w-[220px]!">
                <span className={"material-symbols-outlined" + " " + "absolute! left-[10px]! top-[50%]! [transform:translateY(-50%)]! [color:var(--color-slate-400)]! text-[18px]!"} >
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search name or role"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full! h-[36px]! pl-[32px]! pr-[10px]! [border:1px_solid_var(--color-slate-300)]! rounded-[8px]! text-[13px]! outline-none! [color:var(--color-slate-800)]! [background-color:var(--color-white)]! [font-family:inherit]!"
                />
              </div>
              <button onClick={() => setSortAsc(!sortAsc)} className="flex! items-center! gap-[6px]! h-[36px]! p-[0_12px]! [border:1px_solid_var(--color-slate-300)]! rounded-[8px]! [background-color:var(--color-white)]! text-[13px]! font-medium! [color:var(--color-slate-600)]! cursor-pointer! outline-none! [transition:all_0.15s_ease]!">
                <span className={"material-symbols-outlined" + " " + "text-[18px]! [color:var(--color-slate-500)]!"} >
                  swap_vert
                </span>
                Load {sortAsc ? "↑" : "↓"}
              </button>
              <button
                onClick={fetchWorkload}
                className="flex! items-center! gap-[4px]! h-[36px]! p-[0_12px]! [border:1px_solid_var(--color-slate-300)]! rounded-[8px]! [background-color:var(--color-white)]! text-[13px]! font-medium! [color:var(--color-slate-600)]! cursor-pointer! outline-none! [transition:all_0.15s_ease]!"
                title="Refresh workload"
              >
                <span className={"material-symbols-outlined" + " " + "text-[16px]! [color:var(--color-slate-500)]!"} >
                  refresh
                </span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className={"wl-table-scroll" + " " + "[background-color:var(--color-white)]! [border:1px_solid_var(--color-slate-200)]! rounded-[12px]! overflow-y-auto! overflow-x-auto! max-h-[340px]! [box-shadow:0_1px_3px_0_rgba(0,0,0,0.05)]! relative!"} >
            <table className="w-full! [border-collapse:collapse]! text-[13px]! text-left!">
              <thead>
                <tr>
                  <th className="p-[12px_18px]! [background-color:var(--color-primary-subtle)]! [color:var(--color-slate-600)]! font-semibold! text-[12px]! [border-bottom:1px_solid_var(--color-slate-200)]! sticky! top-[0]! z-[10]! w-[28%]!">User</th>
                  <th className="p-[12px_18px]! [background-color:var(--color-primary-subtle)]! [color:var(--color-slate-600)]! font-semibold! text-[12px]! [border-bottom:1px_solid_var(--color-slate-200)]! sticky! top-[0]! z-[10]! w-[15%]!">Status</th>
                  <th className="p-[12px_18px]! [background-color:var(--color-primary-subtle)]! [color:var(--color-slate-600)]! font-semibold! text-[12px]! [border-bottom:1px_solid_var(--color-slate-200)]! sticky! top-[0]! z-[10]! w-[32%]!">Workload</th>
                  <th className="p-[12px_18px]! [background-color:var(--color-primary-subtle)]! [color:var(--color-slate-600)]! font-semibold! text-[12px]! [border-bottom:1px_solid_var(--color-slate-200)]! sticky! top-[0]! z-[10]! w-[15%]!">Task Days / Week</th>
                  <th className="p-[12px_18px]! [background-color:var(--color-primary-subtle)]! [color:var(--color-slate-600)]! font-semibold! text-[12px]! [border-bottom:1px_solid_var(--color-slate-200)]! sticky! top-[0]! z-[10]! w-[10%]! text-center!">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="p-[40px]! text-center! [color:var(--color-slate-500)]! text-[14px]!">
                      <div className="flex! flex-col! items-center! gap-[12px]!">
                        <span className="wl-spinner" />
                        <span className="[color:var(--color-slate-400)]! text-[13px]!">Loading workload data…</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="5" className="p-[32px]! text-center! [color:var(--color-slate-500)]! text-[14px]!">
                      <div className="flex! flex-col! items-center! gap-[12px]!">
                        <span className={"material-symbols-outlined" + " " + "[color:var(--color-danger)]! text-[32px]!"} >
                          error_outline
                        </span>
                        <span className="[color:var(--color-danger)]!">{error}</span>
                        <button onClick={fetchWorkload} className="flex! items-center! gap-[6px]! h-[36px]! p-[0_12px]! [border:1px_solid_var(--color-slate-300)]! rounded-[8px]! [background-color:var(--color-white)]! text-[13px]! font-medium! [color:var(--color-slate-600)]! cursor-pointer! outline-none! [transition:all_0.15s_ease]!">
                          Retry
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : pagedData.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-[32px]! text-center! [color:var(--color-slate-500)]! text-[14px]!">
                      No users match the current filter.
                    </td>
                  </tr>
                ) : (
                  pagedData.map((row, idx) => {
                    const badge = getStatusBadgeStyle(row.status);
                    const globalIdx = (safeCurrentPage - 1) * PAGE_SIZE + idx;
                    return (
                      <tr key={row.id} className={"table-row-hover" + " " + "[border-bottom:1px_solid_var(--color-slate-100)]! [transition:background-color_0.15s_ease]!"} >
                        {/* User cell */}
                        <td className="p-[14px_18px]! [color:var(--color-slate-900)]! [vertical-align:middle]!">
                          <div className="flex! items-center! gap-[10px]!">
                            <div
                              className="w-[32px]! h-[32px]! rounded-[50%]! [color:var(--color-white)]! flex! items-center! justify-center! font-bold! text-[12px]! shrink-0!" style={{
  backgroundColor: avatarColor(globalIdx)
}}
                            >
                              {getInitials(row.name)}
                            </div>
                            <div>
                              <div className="font-bold! [color:var(--color-slate-900)]!">{row.name}</div>
                              {row.designation && (
                                <div className="text-[11px]! [color:var(--color-slate-400)]! mt-[1px]!">
                                  {row.designation}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Status badge */}
                        <td className="p-[14px_18px]! [color:var(--color-slate-900)]! [vertical-align:middle]!">
                          <span
                            className="inline-flex! items-center! gap-[6px]! p-[4px_10px]! rounded-[12px]! text-[12px]! font-semibold!" style={{
  backgroundColor: badge.backgroundColor,
  color: badge.color
}}
                          >
                            <span
                              className="w-[6px]! h-[6px]! rounded-[50%]!" style={{
  backgroundColor: badge.dotColor
}}
                            />
                            {row.status}
                          </span>
                        </td>

                        {/* Progress bar */}
                        <td className="p-[14px_18px]! [color:var(--color-slate-900)]! [vertical-align:middle]!">
                          <div className="flex! items-center! gap-[10px]!">
                            <div className="flex-1! h-[8px]! rounded-[4px]! [background-color:var(--color-slate-200)]! overflow-hidden!">
                              <div
                                className="h-full! rounded-[4px]! [transition:width_0.4s_ease]!" style={{
  width: `${row.load}%`,
  backgroundColor: badge.barColor
}}
                              />
                            </div>
                            <span className="text-[12px]! [color:var(--color-slate-500)]! min-w-[32px]! text-right!">
                              {row.load}%
                            </span>
                          </div>
                        </td>

                        {/* Task days */}
                        <td className="p-[14px_18px]! [color:var(--color-slate-600)]! [vertical-align:middle]!">{row.taskAssign}</td>

                        {/* Action */}
                        <td className="p-[14px_18px]! [color:var(--color-slate-900)]! [vertical-align:middle]!">
                          <div className="flex! justify-center!">
                            <button
                              className="[background:none]! border-0! cursor-pointer! inline-flex! items-center! justify-center! p-[6px]! rounded-[6px]! [color:var(--color-slate-500)]! [transition:all_0.15s_ease]!"
                              title="View Capacity"
                              onClick={() => openModal(row)}
                            >
                              <span className={"material-symbols-outlined" + " " + "text-[18px]!"} >
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
          <div className="flex! items-center! gap-[10px]! p-[12px_16px]! rounded-[8px]! [background-color:var(--color-primary-subtle)]! mt-[24px]! [border:1px_solid_var(--color-primary-border-mid)]!">
            <span className={"material-symbols-outlined" + " " + "[color:var(--color-primary)]! text-[20px]!"} >
              info
            </span>
            <span className="text-[13px]! [color:var(--color-primary-active)]!">
              Load is built from task estimates. Tasks waiting for approvals may not be reflected.{" "}
              <span className="font-semibold! [color:var(--color-primary)]! underline! cursor-pointer! ml-[4px]!" onClick={() => navigate("/pm/approvals")}>
                Review approvals
              </span>
            </span>
          </div>

          {/* Pagination */}
          {!loading && !error && filteredData.length > 0 && (
            <div className="flex! justify-between! items-center! mt-[24px]! p-[4px_8px]!">
              <span className="text-[12px]! [color:var(--color-slate-500)]!">
                Showing {Math.min((safeCurrentPage - 1) * PAGE_SIZE + 1, filteredData.length)}–
                {Math.min(safeCurrentPage * PAGE_SIZE, filteredData.length)} of{" "}
                {filteredData.length} users
              </span>
              <div className="flex! items-center! gap-[6px]!">
                <button
                  className={"wl-page-btn" + " " + "w-[32px]! h-[32px]! rounded-[6px]! [border:1px_solid_var(--color-slate-300)]! [background-color:var(--color-white)]! [color:var(--color-slate-600)]! text-[12px]! font-medium! flex! items-center! justify-center! cursor-pointer! [transition:all_0.15s_ease]!"}

                  disabled={safeCurrentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <span className={"material-symbols-outlined" + " " + "text-[16px]!"} >
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
                      <span key={`ellipsis-${i}`} className="p-[0_4px]! [color:var(--color-slate-400)]! text-[12px]!">
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        className={"wl-page-btn" + " " + (item === safeCurrentPage ? "[width:32px]! [height:32px]! [border-radius:6px]! [border:1px_solid_var(--color-slate-300)]! [background-color:var(--color-primary)]! [color:var(--color-white)]! [font-size:12px]! [font-weight:600]! [display:flex]! [align-items:center]! [justify-content:center]! [cursor:pointer]! [transition:all_0.15s_ease]! [border-color:var(--color-primary)]!" : "[width:32px]! [height:32px]! [border-radius:6px]! [border:1px_solid_var(--color-slate-300)]! [background-color:var(--color-white)]! [color:var(--color-slate-600)]! [font-size:12px]! [font-weight:500]! [display:flex]! [align-items:center]! [justify-content:center]! [cursor:pointer]! [transition:all_0.15s_ease]!")}
                        onClick={() => setCurrentPage(item)}

                      >
                        {item}
                      </button>
                    )
                  )}
                <button
                  className={"wl-page-btn" + " " + "w-[32px]! h-[32px]! rounded-[6px]! [border:1px_solid_var(--color-slate-300)]! [background-color:var(--color-white)]! [color:var(--color-slate-600)]! text-[12px]! font-medium! flex! items-center! justify-center! cursor-pointer! [transition:all_0.15s_ease]!"}

                  disabled={safeCurrentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  <span className={"material-symbols-outlined" + " " + "text-[16px]!"} >
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
            className="fixed! [inset:0]! [background-color:rgba(15,_23,_42,_0.35)]! z-[999]! [transition:opacity_0.25s_ease]!"
          />

          {/* Right Drawer Panel */}
          <div
            className={"wl-drawer-panel" + " " + "fixed! top-[0]! right-[0]! bottom-[0]! w-[460px]! max-w-[92vw]! h-screen! [background-color:var(--color-white)]! [box-shadow:-8px_0_32px_rgba(15,_23,_42,_0.12)]! z-[1000]! flex! flex-col! overflow-y-auto! p-[32px_28px]! [font-family:'Inter',_sans-serif]!"}

            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Avatar, Name & Subtitle, Close Button */}
            <div className="flex! justify-between! items-start! mb-[24px]!">
              <div className="flex! items-center! gap-[14px]!">
                <div
                  className="w-[44px]! h-[44px]! rounded-[50%]! [background-color:var(--color-primary)]! [color:var(--color-white)]! flex! items-center! justify-center! font-bold! text-[15px]! shrink-0!"
                >
                  {getInitials(selectedUser.name)}
                </div>
                <div>
                  <h2 className="m-0! text-[18px]! font-bold! [color:var(--color-slate-900)]! leading-[1.2]!">
                    {selectedUser.name}
                  </h2>
                  <p className="m-[4px_0_0_0]! text-[12px]! [color:var(--color-slate-500)]!">
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
                className="[background:none]! border-0! cursor-pointer! [color:var(--color-slate-500)]! flex! items-center! justify-center! p-[4px]! rounded-[6px]!"
                aria-label="Close"
              >
                <span className={"material-symbols-outlined" + " " + "text-[20px]!"} >close</span>
              </button>
            </div>

            {/* Metric Box (Load, Capacity, Projects) */}
            <div
              className="[background-color:var(--color-primary-subtle)]! rounded-[14px]! p-[20px_22px]! flex! flex-col! gap-[18px]!"
            >
              <div className="flex! gap-[24px]! justify-between!">
                {/* LOAD */}
                <div className="flex-1!">
                  <div className="text-[10.5px]! font-bold! [color:var(--color-slate-600)]! tracking-[0.6px]! [text-transform:uppercase]!">
                    LOAD
                  </div>
                  <div className="flex! [align-items:baseline]! gap-[6px]! mt-[4px]! flex-wrap!">
                    <span className="text-[22px]! font-bold! [color:var(--color-slate-900)]!">
                      {selectedUser.load}%
                    </span>
                    <span className="text-[12px]! [color:var(--color-slate-500)]!">
                      · {modalTasks.length} assigned tasks
                    </span>
                  </div>
                  {/* Progress bar line */}
                  <div
                    className="h-[3.5px]! rounded-[2px]! mt-[8px]! w-full!" style={{
  backgroundColor: selectedUser.load >= 80 ? "var(--color-danger-dark)" : selectedUser.load >= 50 ? "var(--color-success-alt)" : "var(--color-warning)"
}}
                  />
                </div>

                {/* CAPACITY */}
                <div className="flex-1!">
                  <div className="text-[10.5px]! font-bold! [color:var(--color-slate-600)]! tracking-[0.6px]! [text-transform:uppercase]!">
                    CAPACITY
                  </div>
                  <div className="flex! [align-items:baseline]! gap-[6px]! mt-[4px]!">
                    <span className="text-[22px]! font-bold! [color:var(--color-slate-900)]!">
                      {selectedUser.availData?.weekly_capacity ?? 0} points / week
                    </span>
                    <span className="text-[12px]! [color:var(--color-slate-500)]!">
                      · full week
                    </span>
                  </div>
                </div>
              </div>

              {/* PROJECTS */}
              <div>
                <div className="text-[10.5px]! font-bold! [color:var(--color-slate-600)]! tracking-[0.6px]! [text-transform:uppercase]!">
                  PROJECTS
                </div>
                <div className="text-[13px]! font-medium! [color:var(--color-slate-800)]! mt-[4px]!">
                  {(() => {
                    const projects = Array.from(new Set(modalTasks.map((t) => t.Project_Name).filter(Boolean)));
                    return projects.length > 0 ? projects.join(", ") : (selectedMainProject || "Project");
                  })()}
                </div>
              </div>
            </div>

            {/* Task List Section */}
            <div className="mt-[12px]!">
              <div
                className="text-[11px]! font-bold! [color:var(--color-slate-500)]! [text-transform:uppercase]! tracking-[0.6px]! mb-[18px]!"
              >
                {modalTasksLoading
                  ? "THIS WEEK · LOADING ITEMS…"
                  : `THIS WEEK · ${modalTasks.length} ITEMS`}
              </div>

              {modalTasksLoading ? (
                <div className="flex! items-center! gap-[10px]! [color:var(--color-slate-400)]! p-[16px_0]!">
                  <span className="wl-spinner" />
                  <span className="text-[13px]!">Fetching tasks…</span>
                </div>
              ) : modalTasks.length === 0 ? (
                <p className="text-[13px]! [color:var(--color-slate-400)]!">No tasks assigned this week.</p>
              ) : (
                <div className="flex! flex-col! gap-[16px]!">
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
                        className="flex! justify-between! items-start! gap-[12px]! pb-[14px]!" style={{
  borderBottom: idx === modalTasks.length - 1 ? "none" : "1px solid var(--color-slate-100)"
}}
                      >
                        {/* Left: Dot & Name / Project / Due */}
                        <div className="flex! gap-[10px]! items-start! flex-1! min-w-0!">
                          <span
                            className="w-[8px]! h-[8px]! rounded-[50%]! mt-[5px]! shrink-0!" style={{
  backgroundColor: statusStyle.dot
}}
                          />
                          <div className="min-w-0!">
                            <h4
                              className="m-0! text-[13.5px]! font-semibold! [color:var(--color-slate-900)]! leading-[1.3]! [word-break:break-word]!"
                            >
                              {task.Task_Name || "Untitled Task"}
                            </h4>
                            <p
                              className="m-[3px_0_0_0]! text-[11.5px]! [color:var(--color-slate-500)]! leading-[1.4]! [word-break:break-word]!"
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
                        <div className="flex! items-center! gap-[8px]! shrink-0!">
                          <span
                            className="text-[11px]! [color:var(--color-slate-500)]! [background-color:var(--color-slate-100)]! p-[3px_7px]! rounded-[5px]! font-medium! min-w-[26px]! text-center!"
                          >
                            {hoursLabel}
                          </span>
                          <span
                            className="text-[11px]! p-[3px_9px]! rounded-[6px]! font-semibold! whitespace-nowrap!" style={{
  color: statusStyle.color,
  backgroundColor: statusStyle.bg
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
