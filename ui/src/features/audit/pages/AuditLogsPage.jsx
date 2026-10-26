import Paginator from '../components/Paginator.jsx'
import logStyles from '../components/logStyles.js'


import useLogHistory from '../hooks/useLogHistory.js'
import DetailRow from '../components/LogDetailRow.jsx'
import { formatLogDate as fmtDate } from '../logFormat.js'
import AdminPageLayout from "../components/AdminPageLayout.jsx";
import DatePicker from "../../../components/common/DatePicker.jsx";
import Navbar from "../../../layouts/Navbar.jsx";
import { FilterSelect, SearchBar } from "../../../components/common/SearchControls.jsx";

// ── Action badge colors map ──────────────────────────────────────────
const ACTION_COLORS = {
  login: { bg: "var(--color-success-bg)", text: "var(--color-success-dark)" },
  logout: { bg: "var(--color-slate-100)", text: "var(--color-slate-600)" },
  login_failed: { bg: "var(--color-danger-border)", text: "#b91c1c" },
  created: { bg: "var(--color-primary-border)", text: "var(--color-primary-hover)" },
  updated: { bg: "#fff7ed", text: "var(--color-role-pm-dark)" },
  deleted: { bg: "var(--color-danger-border)", text: "#b91c1c" },
  completed: { bg: "var(--color-success-bg)", text: "var(--color-success-dark)" },
  status_changed: { bg: "#fff7ed", text: "var(--color-role-pm-dark)" },
  uploaded: { bg: "#ccfbf1", text: "#0d9488" },
  downloaded: { bg: "#cffafe", text: "#0891b2" },
  assigned: { bg: "var(--color-primary-border)", text: "var(--color-primary-hover)" },
  reassigned: { bg: "#fff7ed", text: "var(--color-role-pm-dark)" },
  reordered: { bg: "#fff7ed", text: "var(--color-role-pm-dark)" },
  access_denied: { bg: "var(--color-danger-border)", text: "#b91c1c" },
  timer_paused: { bg: "var(--color-slate-100)", text: "var(--color-slate-600)" },
  timer_resumed: { bg: "var(--color-success-bg)", text: "var(--color-success-dark)" },
};

// ── Entity type badge colors map ─────────────────────────────────────
const ENTITY_COLORS = {
  project: { bg: "#f3e8ff", text: "#7e22ce" },
  task: { bg: "var(--color-primary-border)", text: "var(--color-primary-hover)" },
  sprint: { bg: "#e0e7ff", text: "#3730a3" },
  milestone: { bg: "#f3e8ff", text: "#7e22ce" },
  feature: { bg: "#f3e8ff", text: "#7e22ce" },
  resource_file: { bg: "#ccfbf1", text: "#0d9488" },
  user_account: { bg: "#ffedd5", text: "var(--color-role-pm-dark)" },
  dependency: { bg: "var(--color-primary-border)", text: "var(--color-primary-hover)" },
  session: { bg: "var(--color-slate-100)", text: "var(--color-slate-600)" },
};

export default function AuditLogsPage({ user }) {
  const { logs, pagination, filters, setFilters, loading, error, selectedLog, setSelectedLog, autoRefresh, setAutoRefresh, fetchLogs, handleFilterChange, handleSearch, clearFilters } = useLogHistory('audit-logs', { action: '', entity_type: '', search: '', date_from: '', date_to: '' })
  // ── render ─────────────────────────────────────────────────────────
  return (
    <AdminPageLayout user={user}>

      {/* Sidebar — Admin or PM depending on route */}


      {/* Main Container */}
      <div style={s.mainContainer}>
        {/* Top Navbar */}
        <Navbar user={user} />

        {/* Page Body */}
        <div style={s.pageBody}>
          {/* ── Title Row ─────────────────────────────────────────────── */}
          <div style={s.titleRow}>
            <div>
              <h1 style={s.pageTitle}>Audit Logs</h1>
              <span style={s.pageSubtitle}>Security audit trail & activity history</span>
            </div>
            <div style={s.titleActions}>
              <label style={s.toggleLabel}>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={() => setAutoRefresh(!autoRefresh)}
                  style={{ marginRight: 6, accentColor: "var(--color-primary)", cursor: "pointer" }}
                />
                Auto-refresh (10s)
              </label>
              <button
                type="button"
                onClick={() => fetchLogs(pagination.page)}
                style={s.refreshBtn}
                title="Refresh"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                  refresh
                </span>
                Refresh
              </button>
            </div>
          </div>

          {/* ── Filters ───────────────────────────────────────────────── */}
          <form onSubmit={handleSearch} style={s.filterBar}>
            <SearchBar
              name="search"
              placeholder="Search description, user or entity…"
              value={filters.search}
              onChange={handleFilterChange}
            />
            <FilterSelect
              name="action"
              value={filters.action}
              onChange={handleFilterChange}
              minWidth="140px"
            >
              <option value="">All Actions</option>
              {Object.keys(ACTION_COLORS).map((act) => (
                <option key={act} value={act}>
                  {act.replace("_", " ").toUpperCase()}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              name="entity_type"
              value={filters.entity_type}
              onChange={handleFilterChange}
              minWidth="140px"
            >
              <option value="">All Entity Types</option>
              {Object.keys(ENTITY_COLORS).map((ent) => (
                <option key={ent} value={ent}>
                  {ent.replace("_", " ").toUpperCase()}
                </option>
              ))}
            </FilterSelect>
            <div style={{ width: "150px" }}>
              <DatePicker
                value={filters.date_from}
                onChange={(val) => setFilters((prev) => ({ ...prev, date_from: val }))}
                allowPastDates={true}
                placeholder="From date"
                style={{ height: "38px" }}
              />
            </div>
            <div style={{ width: "150px" }}>
              <DatePicker
                value={filters.date_to}
                onChange={(val) => setFilters((prev) => ({ ...prev, date_to: val }))}
                allowPastDates={true}
                placeholder="To date"
                style={{ height: "38px" }}
              />
            </div>
            <button type="submit" style={s.applyBtn}>
              Apply
            </button>
            <button type="button" onClick={clearFilters} style={s.clearBtn}>
              Clear
            </button>
          </form>

          {error && <div role="alert">{error}</div>}
          {/* ── Table ─────────────────────────────────────────────────── */}
          <div style={s.tableCard}>
            {loading && (
              <div style={s.loadingOverlay}>
                <div style={s.spinnerLg} />
              </div>
            )}
            <div style={{ overflowX: "auto" }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Timestamp</th>
                    <th style={s.th}>User</th>
                    <th style={s.th}>Action</th>
                    <th style={s.th}>Entity Type</th>
                    <th style={s.th}>Entity Name</th>
                    <th style={{ ...s.th, width: "100%" }}>Description</th>
                    <th style={s.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 && !loading && (
                    <tr>
                      <td colSpan={7} style={s.emptyCell}>
                        No audit logs found.
                      </td>
                    </tr>
                  )}
                  {logs.map((log) => {
                    const ac = ACTION_COLORS[log.action] || { bg: "var(--color-slate-100)", text: "var(--color-slate-600)" };
                    const ec = ENTITY_COLORS[log.entity_type] || { bg: "var(--color-slate-100)", text: "var(--color-slate-600)" };
                    return (
                      <tr key={log.id} className="audit-row" style={s.tr}>
                        <td style={s.td}>{fmtDate(log.timestamp)}</td>
                        <td style={{ ...s.td, fontWeight: 600 }}>{log.user}</td>
                        <td style={s.td}>
                          <span
                            style={{
                              ...s.badge,
                              backgroundColor: ac.bg,
                              color: ac.text,
                            }}
                          >
                            {log.action.replace("_", " ")}
                          </span>
                        </td>
                        <td style={s.td}>
                          <span
                            style={{
                              ...s.badge,
                              backgroundColor: ec.bg,
                              color: ec.text,
                            }}
                          >
                            {log.entity_type.replace("_", " ")}
                          </span>
                        </td>
                        <td style={{ ...s.td, ...s.entityCell, fontWeight: 500 }}>{log.entity_name || "—"}</td>
                        <td style={{ ...s.td, ...s.descCell }}>{log.description}</td>
                        <td style={s.td}>
                          <button
                            onClick={() => setSelectedLog(log)}
                            style={s.detailBtn}
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Paginator pagination={pagination} onPage={fetchLogs} />
          </div>
        </div>
      </div>

      {/* ── Detail modal ──────────────────────────────────────────── */}
      {selectedLog && (
        <div style={s.overlay} onClick={() => setSelectedLog(null)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "var(--color-primary)" }}>
                  history
                </span>
                <h2 style={s.modalTitle}>Audit Log Details</h2>
              </div>
              <button onClick={() => setSelectedLog(null)} style={s.closeBtn}>
                ✕
              </button>
            </div>
            <div style={s.modalBody}>
              <DetailRow label="Timestamp" value={fmtDate(selectedLog.timestamp)} />
              <DetailRow label="User" value={selectedLog.user} />
              <DetailRow label="Action" value={selectedLog.action} />
              <DetailRow label="Entity Type" value={selectedLog.entity_type} />
              <DetailRow label="Entity ID" value={selectedLog.entity_id || "—"} />
              <DetailRow label="Entity Name" value={selectedLog.entity_name || "—"} />
              <DetailRow label="Description" value={selectedLog.description} />
              <DetailRow label="Request Path" value={selectedLog.request_path || "—"} />
              <DetailRow label="IP Address" value={selectedLog.ip_address || "—"} />
              <div style={s.detailRow}>
                <span style={s.detailLabel}>Context</span>
                <span style={s.detailValue}>
                  <pre style={s.jsonPre}>
                    {JSON.stringify(selectedLog.context, null, 2)}
                  </pre>
                </span>
              </div>
              {(selectedLog.old_values || selectedLog.new_values) && (
                <>
                  <div style={s.detailRow}>
                    <span style={s.detailLabel}>Old Values</span>
                    <span style={s.detailValue}>
                      <pre style={s.jsonPre}>
                        {JSON.stringify(selectedLog.old_values, null, 2)}
                      </pre>
                    </span>
                  </div>
                  <div style={s.detailRow}>
                    <span style={s.detailLabel}>New Values</span>
                    <span style={s.detailValue}>
                      <pre style={s.jsonPre}>
                        {JSON.stringify(selectedLog.new_values, null, 2)}
                      </pre>
                    </span>
                  </div>
                </>
              )}
              <div style={s.detailRow}>
                <span style={s.detailLabel}>User Agent</span>
                <span
                  style={{
                    ...s.detailValue,
                    wordBreak: "break-all",
                    fontSize: 12,
                    textAlign: "left",
                  }}
                >
                  {selectedLog.user_agent || "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminPageLayout>
  );
}

// ── Small helper components ──────────────────────────────────────────

const s = { ...logStyles, ...{
  "titleRow": {
    "display": "flex",
    "alignItems": "center",
    "justifyContent": "space-between",
    "marginBottom": "18px"
  },
  "pageTitle": {
    "fontSize": "18px",
    "fontWeight": "700",
    "color": "var(--color-slate-900)",
    "margin": 0,
    "letterSpacing": "-0.2px"
  },
  "pageSubtitle": {
    "fontSize": "12px",
    "color": "var(--color-slate-500)",
    "marginTop": "3px",
    "display": "block"
  },
  "titleActions": {
    "display": "flex",
    "alignItems": "center",
    "gap": "14px"
  },
  "refreshBtn": {
    "display": "flex",
    "alignItems": "center",
    "gap": "6px",
    "padding": "6px 14px",
    "height": "34px",
    "backgroundColor": "var(--color-white)",
    "border": "1px solid var(--color-slate-300)",
    "borderRadius": "8px",
    "fontSize": "13px",
    "fontWeight": "500",
    "color": "var(--color-slate-700)",
    "cursor": "pointer",
    "transition": "all 0.15s ease"
  },
  "pageBody": {
    "padding": "24px 32px",
    "flex": 1
  },
  "applyBtn": {
    "height": "38px",
    "padding": "0 22px",
    "backgroundColor": "var(--color-primary)",
    "color": "var(--color-white)",
    "border": "none",
    "borderRadius": "8px",
    "fontWeight": "600",
    "fontSize": "13px",
    "cursor": "pointer",
    "boxShadow": "0 1px 2px rgba(37, 99, 235, 0.15)",
    "transition": "background-color 0.15s ease"
  },
  "clearBtn": {
    "height": "38px",
    "padding": "0 18px",
    "backgroundColor": "var(--color-white)",
    "color": "var(--color-slate-700)",
    "border": "1px solid var(--color-slate-300)",
    "borderRadius": "8px",
    "fontWeight": "500",
    "fontSize": "13px",
    "cursor": "pointer",
    "transition": "background-color 0.15s ease"
  },
  "descCell": {
    "maxWidth": 320,
    "overflow": "hidden",
    "textOverflow": "ellipsis",
    "whiteSpace": "normal"
  },
  "entityCell": {
    "maxWidth": 180,
    "overflow": "hidden",
    "textOverflow": "ellipsis",
    "whiteSpace": "normal"
  },
  "badge": {
    "display": "inline-block",
    "padding": "4px 10px",
    "borderRadius": "12px",
    "fontWeight": "600",
    "fontSize": "11px",
    "letterSpacing": "0.03em",
    "textTransform": "capitalize"
  },
  "modal": {
    "backgroundColor": "var(--color-white)",
    "borderRadius": "14px",
    "width": "90%",
    "maxWidth": "640px",
    "maxHeight": "85vh",
    "overflow": "auto",
    "boxShadow": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "border": "1px solid var(--color-slate-200)"
  },
  "jsonPre": {
    "margin": "8px 0 0",
    "padding": "12px",
    "backgroundColor": "var(--color-slate-50)",
    "border": "1px solid var(--color-slate-200)",
    "borderRadius": "8px",
    "fontFamily": "'Roboto Mono', monospace",
    "fontSize": "12px",
    "overflowX": "auto",
    "color": "var(--color-slate-700)",
    "textAlign": "left"
  }
} }
