import Paginator from '../components/Paginator.jsx'
import logStyles from '../components/logStyles.js'


import useLogHistory from '../hooks/useLogHistory.js'
import DetailRow from '../components/LogDetailRow.jsx'
import { formatLogDate as fmtDate } from '../logFormat.js'
import AdminPageLayout from "../components/AdminPageLayout.jsx";
import DatePicker from "../../../components/common/DatePicker.jsx";
import MonitoringHeader from '../components/MonitoringHeader.jsx'
import { FilterSelect, SearchBar } from "../../../components/common/SearchControls.jsx";

// ── Method badge colour map ──────────────────────────────────────────
const METHOD_COLORS = {
  GET: { bg: "var(--color-success-bg)", text: "var(--color-success-dark)" },
  POST: { bg: "var(--color-primary-border)", text: "var(--color-primary-hover)" },
  PUT: { bg: "#fef3cd", text: "#856404" },
  PATCH: { bg: "#fff7ed", text: "var(--color-role-pm-dark)" },
  DELETE: { bg: "var(--color-danger-border)", text: "#b91c1c" },
  OPTIONS: { bg: "#f3e8ff", text: "#7e22ce" },
  HEAD: { bg: "var(--color-slate-100)", text: "var(--color-slate-600)" },
};

// ── Status code pill colour ──────────────────────────────────────────
const getStatusColor = (code) => {
  if (code >= 200 && code < 300) return { bg: "var(--color-success-bg)", text: "var(--color-success-dark)" };
  if (code >= 300 && code < 400) return { bg: "var(--color-primary-border)", text: "var(--color-primary-hover)" };
  if (code >= 400 && code < 500) return { bg: "#fef3cd", text: "#856404" };
  if (code >= 500) return { bg: "var(--color-danger-border)", text: "#b91c1c" };
  return { bg: "var(--color-slate-100)", text: "var(--color-slate-600)" };
};

// ── Response-time colour ─────────────────────────────────────────────
const getLatencyColor = (ms) => {
  if (ms < 50) return "#16a34a";
  if (ms < 200) return "var(--color-primary)";
  if (ms < 500) return "var(--color-role-pm-dark)";
  return "var(--color-danger-dark)";
};

export default function ApiLogsPage({ user }) {
  const { logs, metrics, pagination, filters, setFilters, loading, error, selectedLog, setSelectedLog, autoRefresh, setAutoRefresh, fetchLogs, handleFilterChange, handleSearch, clearFilters } = useLogHistory('api-logs', { method: '', status_code: '', search: '', date_from: '', date_to: '' })
  // ── render ─────────────────────────────────────────────────────────
  return (
    <AdminPageLayout user={user}>

      {/* Admin Sidebar */}


      {/* Main Container */}
      <div style={s.mainContainer}>
        {/* Top Header */}
        <MonitoringHeader user={user} title="API Request Logs" subtitle="Monitor and inspect all incoming API requests" icon="speed" actionsGap={14} actions={<><label style={s.toggleLabel}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={() => setAutoRefresh(!autoRefresh)}
                style={{ marginRight: 6 }}
              />
              Auto-refresh (10s)
            </label>
            <button
              type="button"
              onClick={() => fetchLogs(pagination.page)}
              style={s.refreshBtn}
              title="Refresh"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                refresh
              </span>
              Refresh
            </button></>} />

        {/* Page Body */}
        <div style={s.pageBody}>
          {/* ── Metrics cards ─────────────────────────────────────────── */}
          <div style={s.metricsRow}>
            <MetricCard
              label="Total Requests"
              value={metrics.total_requests.toLocaleString()}
              icon="monitoring"
              iconBg="var(--color-primary-subtle)"
              iconColor="var(--color-primary)"
            />
            <MetricCard
              label="Avg Latency"
              value={`${metrics.avg_response_time} ms`}
              icon="speed"
              iconBg="#fff7ed"
              iconColor="var(--color-role-pm-dark)"
            />
            <MetricCard
              label="Success Rate"
              value={`${metrics.success_rate}%`}
              icon="check_circle"
              iconBg="#f0fdf4"
              iconColor="#16a34a"
            />
            <MetricCard
              label="Client Errors (4xx)"
              value={metrics.client_errors.toLocaleString()}
              icon="warning"
              iconBg="#fffbeb"
              iconColor="var(--color-warning-dark)"
            />
            <MetricCard
              label="Server Errors (5xx)"
              value={metrics.server_errors.toLocaleString()}
              icon="error"
              iconBg="var(--color-danger-bg)"
              iconColor="var(--color-danger-dark)"
            />
          </div>

          {/* ── Filters ───────────────────────────────────────────────── */}
          <form onSubmit={handleSearch} style={s.filterBar}>
            <SearchBar
              name="search"
              placeholder="Search path or user…"
              value={filters.search}
              onChange={handleFilterChange}
            />
            <FilterSelect
              name="method"
              value={filters.method}
              onChange={handleFilterChange}
            >
              <option value="">All Methods</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </FilterSelect>
            <FilterSelect
              name="status_code"
              value={filters.status_code}
              onChange={handleFilterChange}
            >
              <option value="">All Status</option>
              <option value="2xx">2xx Success</option>
              <option value="4xx">4xx Client Error</option>
              <option value="5xx">5xx Server Error</option>
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
                    <th style={s.th}>Method</th>
                    <th style={s.th}>Endpoint</th>
                    <th style={s.th}>User</th>
                    <th style={s.th}>Status</th>
                    <th style={s.th}>Latency</th>
                    <th style={s.th}>IP Address</th>
                    <th style={s.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 && !loading && (
                    <tr>
                      <td colSpan={8} style={s.emptyCell}>
                        No logs found.
                      </td>
                    </tr>
                  )}
                  {logs.map((log) => {
                    const mc = METHOD_COLORS[log.method] || METHOD_COLORS.GET;
                    const sc = getStatusColor(log.status_code);
                    return (
                      <tr key={log.id} className="api-row" style={s.tr}>
                        <td style={s.td}>{fmtDate(log.created_at)}</td>
                        <td style={s.td}>
                          <span
                            style={{
                              ...s.badge,
                              backgroundColor: mc.bg,
                              color: mc.text,
                            }}
                          >
                            {log.method}
                          </span>
                        </td>
                        <td style={{ ...s.td, ...s.pathCell }}>{log.path}</td>
                        <td style={{ ...s.td, fontWeight: 600 }}>{log.user || "Anonymous"}</td>
                        <td style={s.td}>
                          <span
                            style={{
                              ...s.badge,
                              backgroundColor: sc.bg,
                              color: sc.text,
                            }}
                          >
                            {log.status_code}
                          </span>
                        </td>
                        <td
                          style={{
                            ...s.td,
                            color: getLatencyColor(log.response_time_ms),
                            fontWeight: 600,
                          }}
                        >
                          {log.response_time_ms} ms
                        </td>
                        <td style={s.td}>{log.ip_address || "—"}</td>
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
                  speed
                </span>
                <h2 style={s.modalTitle}>Request Details</h2>
              </div>
              <button onClick={() => setSelectedLog(null)} style={s.closeBtn}>
                ✕
              </button>
            </div>
            <div style={s.modalBody}>
              <DetailRow
                label="Timestamp"
                value={fmtDate(selectedLog.created_at)}
              />
              <DetailRow label="Method" value={selectedLog.method} />
              <DetailRow label="Path" value={selectedLog.path} />
              <DetailRow label="Status Code" value={selectedLog.status_code} />
              <DetailRow
                label="Response Time"
                value={`${selectedLog.response_time_ms} ms`}
              />
              <DetailRow label="User" value={selectedLog.user || "Anonymous"} />
              <DetailRow
                label="IP Address"
                value={selectedLog.ip_address || "—"}
              />
              <DetailRow
                label="Request Body Size"
                value={`${selectedLog.request_body_size} bytes`}
              />
              <DetailRow
                label="Query Params"
                value={selectedLog.query_params || "—"}
              />
              <div style={s.detailRow}>
                <span style={s.detailLabel}>User Agent</span>
                <span
                  style={{
                    ...s.detailValue,
                    wordBreak: "break-all",
                    fontSize: 12,
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

function MetricCard({ label, value, icon, iconBg, iconColor }) {
  return (
    <div style={s.metricCard}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={s.metricLabel}>{label}</div>
          <div style={s.metricValue}>{value}</div>
        </div>
        <div style={{ ...s.metricIconBox, backgroundColor: iconBg, color: iconColor }}>
          <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>
            {icon}
          </span>
        </div>
      </div>
    </div>
  );
}

const s = { ...logStyles, ...{
  "refreshBtn": {
    "display": "flex",
    "alignItems": "center",
    "gap": "6px",
    "padding": "8px 14px",
    "backgroundColor": "var(--color-white)",
    "border": "1px solid var(--color-slate-300)",
    "borderRadius": "8px",
    "fontSize": "13px",
    "fontWeight": "600",
    "color": "var(--color-slate-600)",
    "cursor": "pointer",
    "transition": "all 0.15s ease"
  },
  "avatarCircle": {
    "width": "34px",
    "height": "34px",
    "borderRadius": "50%",
    "backgroundColor": "var(--color-slate-900)",
    "color": "var(--color-white)",
    "display": "flex",
    "alignItems": "center",
    "justifyContent": "center",
    "fontSize": "12px",
    "fontWeight": "700",
    "cursor": "pointer",
    "border": "2px solid var(--color-slate-200)"
  },
  "pageBody": {
    "padding": "32px",
    "flex": 1
  },
  "metricsRow": {
    "display": "grid",
    "gridTemplateColumns": "repeat(auto-fit, minmax(200px, 1fr))",
    "gap": "16px",
    "marginBottom": "28px"
  },
  "metricCard": {
    "backgroundColor": "var(--color-white)",
    "borderRadius": "12px",
    "padding": "18px 20px",
    "border": "1px solid var(--color-slate-200)",
    "boxShadow": "0 1px 3px rgba(0, 0, 0, 0.04)"
  },
  "metricIconBox": {
    "width": "44px",
    "height": "44px",
    "borderRadius": "10px",
    "display": "flex",
    "alignItems": "center",
    "justifyContent": "center"
  },
  "metricValue": {
    "fontSize": "26px",
    "fontWeight": "800",
    "color": "var(--color-slate-900)",
    "marginTop": "4px"
  },
  "metricLabel": {
    "fontSize": "12px",
    "fontWeight": "600",
    "color": "var(--color-slate-500)",
    "textTransform": "uppercase",
    "letterSpacing": "0.04em"
  },
  "applyBtn": {
    "height": "38px",
    "padding": "0 20px",
    "backgroundColor": "var(--color-primary)",
    "color": "var(--color-white)",
    "border": "none",
    "borderRadius": "8px",
    "fontWeight": "600",
    "fontSize": "13px",
    "cursor": "pointer",
    "boxShadow": "0 2px 4px rgba(37, 99, 235, 0.2)"
  },
  "clearBtn": {
    "height": "38px",
    "padding": "0 16px",
    "backgroundColor": "var(--color-white)",
    "color": "var(--color-primary)",
    "border": "1px solid var(--color-primary)",
    "borderRadius": "8px",
    "fontWeight": "600",
    "fontSize": "13px",
    "cursor": "pointer"
  },
  "pathCell": {
    "maxWidth": 260,
    "overflow": "hidden",
    "textOverflow": "ellipsis",
    "fontFamily": "'Roboto Mono', monospace",
    "fontSize": 12
  },
  "badge": {
    "display": "inline-block",
    "padding": "3px 10px",
    "borderRadius": "12px",
    "fontWeight": "600",
    "fontSize": "11px",
    "letterSpacing": "0.03em"
  },
  "modal": {
    "backgroundColor": "var(--color-white)",
    "borderRadius": "14px",
    "width": "90%",
    "maxWidth": "600px",
    "maxHeight": "85vh",
    "overflow": "auto",
    "boxShadow": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "border": "1px solid var(--color-slate-200)"
  }
} }
