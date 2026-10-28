import Paginator from '../Paginator.jsx'

import useLogHistory from '../hooks/useLogHistory.js'
import DetailRow from '../LogDetailRow.jsx'
import { formatLogDate as fmtDate } from '../logFormat.js'
import { MonitoringLayout } from "../../../layouts/Loading.jsx";
import DatePicker from "../../../shared/components/DatePicker.jsx";
import MonitoringHeader from '../MonitoringHeader.jsx'
import { FilterSelect, SearchBar } from "../../../shared/components/SearchControls.jsx";

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
    <MonitoringLayout user={user}>

      {/* Admin Sidebar */}

      {/* Main Container */}
      <div className="flex-1! flex! flex-col! min-w-0! h-screen! overflow-y-auto!">
        {/* Top Header */}
        <MonitoringHeader user={user} title="API Request Logs" subtitle="Monitor and inspect all incoming API requests" icon="speed" actionsGap={14} actions={<><label className="text-[13px]! [color:var(--color-slate-600)]! flex! items-center! cursor-pointer!">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={() => setAutoRefresh(!autoRefresh)}
                className="mr-[6px]!"
              />
              Auto-refresh (10s)
            </label>
            <button
              type="button"
              onClick={() => fetchLogs(pagination.page)}
              className="flex! items-center! gap-[6px]! p-[8px_14px]! [background-color:var(--color-white)]! [border:1px_solid_var(--color-slate-300)]! rounded-[8px]! text-[13px]! font-semibold! [color:var(--color-slate-600)]! cursor-pointer! [transition:all_0.15s_ease]!"
              title="Refresh"
            >
              <span className={"material-symbols-outlined" + " " + "text-[18px]!"} >
                refresh
              </span>
              Refresh
            </button></>} />

        {/* Page Body */}
        <div className="p-[32px]! flex-1!">
          {/* ── Metrics cards ─────────────────────────────────────────── */}
          <div className="grid! grid-cols-[repeat(auto-fit,_minmax(200px,_1fr))]! gap-[16px]! mb-[28px]!">
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
          <form onSubmit={handleSearch} className="flex! gap-[10px]! flex-wrap! mb-[20px]! items-center!">
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
            <div className="w-[150px]!">
              <DatePicker
                value={filters.date_from}
                onChange={(val) => setFilters((prev) => ({ ...prev, date_from: val }))}
                allowPastDates={true}
                placeholder="From date"
                controlClassName="[height:38px]!"
              />
            </div>
            <div className="w-[150px]!">
              <DatePicker
                value={filters.date_to}
                onChange={(val) => setFilters((prev) => ({ ...prev, date_to: val }))}
                allowPastDates={true}
                placeholder="To date"
                controlClassName="[height:38px]!"
              />
            </div>
            <button type="submit" className="h-[38px]! p-[0_20px]! [background-color:var(--color-primary)]! [color:var(--color-white)]! border-0! rounded-[8px]! font-semibold! text-[13px]! cursor-pointer! [box-shadow:0_2px_4px_rgba(37,_99,_235,_0.2)]!">
              Apply
            </button>
            <button type="button" onClick={clearFilters} className="h-[38px]! p-[0_16px]! [background-color:var(--color-white)]! [color:var(--color-primary)]! [border:1px_solid_var(--color-primary)]! rounded-[8px]! font-semibold! text-[13px]! cursor-pointer!">
              Clear
            </button>
          </form>

          {error && <div role="alert">{error}</div>}
          {/* ── Table ─────────────────────────────────────────────────── */}
          <div className="relative! [background-color:var(--color-white)]! rounded-[12px]! [border:1px_solid_var(--color-slate-200)]! overflow-hidden! [box-shadow:0_1px_3px_rgba(0,_0,_0,_0.04)]!">
            {loading && (
              <div className="absolute! [inset:0]! [background-color:rgba(255,255,255,0.7)]! flex! justify-center! items-center! z-[5]! rounded-[12px]!">
                <div className="w-[36px]! h-[36px]! [border:3px_solid_var(--color-slate-200)]! [border-top-color:var(--color-primary)]! rounded-[50%]! [animation:spin_0.8s_linear_infinite]!" />
              </div>
            )}
            <div className="overflow-x-auto!">
              <table className="w-full! [border-collapse:collapse]! text-[13px]! text-left!">
                <thead>
                  <tr>
                    <th className="p-[12px_16px]! [background-color:var(--color-slate-50)]! [border-bottom:1px_solid_var(--color-slate-200)]! [color:var(--color-slate-600)]! font-semibold! text-[11px]! [text-transform:uppercase]! tracking-[0.04em]! whitespace-nowrap!">Timestamp</th>
                    <th className="p-[12px_16px]! [background-color:var(--color-slate-50)]! [border-bottom:1px_solid_var(--color-slate-200)]! [color:var(--color-slate-600)]! font-semibold! text-[11px]! [text-transform:uppercase]! tracking-[0.04em]! whitespace-nowrap!">Method</th>
                    <th className="p-[12px_16px]! [background-color:var(--color-slate-50)]! [border-bottom:1px_solid_var(--color-slate-200)]! [color:var(--color-slate-600)]! font-semibold! text-[11px]! [text-transform:uppercase]! tracking-[0.04em]! whitespace-nowrap!">Endpoint</th>
                    <th className="p-[12px_16px]! [background-color:var(--color-slate-50)]! [border-bottom:1px_solid_var(--color-slate-200)]! [color:var(--color-slate-600)]! font-semibold! text-[11px]! [text-transform:uppercase]! tracking-[0.04em]! whitespace-nowrap!">User</th>
                    <th className="p-[12px_16px]! [background-color:var(--color-slate-50)]! [border-bottom:1px_solid_var(--color-slate-200)]! [color:var(--color-slate-600)]! font-semibold! text-[11px]! [text-transform:uppercase]! tracking-[0.04em]! whitespace-nowrap!">Status</th>
                    <th className="p-[12px_16px]! [background-color:var(--color-slate-50)]! [border-bottom:1px_solid_var(--color-slate-200)]! [color:var(--color-slate-600)]! font-semibold! text-[11px]! [text-transform:uppercase]! tracking-[0.04em]! whitespace-nowrap!">Latency</th>
                    <th className="p-[12px_16px]! [background-color:var(--color-slate-50)]! [border-bottom:1px_solid_var(--color-slate-200)]! [color:var(--color-slate-600)]! font-semibold! text-[11px]! [text-transform:uppercase]! tracking-[0.04em]! whitespace-nowrap!">IP Address</th>
                    <th className="p-[12px_16px]! [background-color:var(--color-slate-50)]! [border-bottom:1px_solid_var(--color-slate-200)]! [color:var(--color-slate-600)]! font-semibold! text-[11px]! [text-transform:uppercase]! tracking-[0.04em]! whitespace-nowrap!">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 && !loading && (
                    <tr>
                      <td colSpan={8} className="text-center! p-[40px]! [color:var(--color-slate-400)]! text-[14px]!">
                        No logs found.
                      </td>
                    </tr>
                  )}
                  {logs.map((log) => {
                    const mc = METHOD_COLORS[log.method] || METHOD_COLORS.GET;
                    const sc = getStatusColor(log.status_code);
                    return (
                      <tr key={log.id} className={"api-row" + " " + "[border-bottom:1px_solid_var(--color-slate-100)]! [transition:background-color_0.12s_ease]!"} >
                        <td className="p-[12px_16px]! whitespace-nowrap! [color:var(--color-slate-800)]! [vertical-align:middle]!">{fmtDate(log.created_at)}</td>
                        <td className="p-[12px_16px]! whitespace-nowrap! [color:var(--color-slate-800)]! [vertical-align:middle]!">
                          <span
                            className="inline-block! p-[3px_10px]! rounded-[12px]! font-semibold! text-[11px]! tracking-[0.03em]!" style={{
  backgroundColor: mc.bg,
  color: mc.text
}}
                          >
                            {log.method}
                          </span>
                        </td>
                        <td className="p-[12px_16px]! whitespace-nowrap! [color:var(--color-slate-800)]! [vertical-align:middle]! max-w-[260px]! overflow-hidden! text-ellipsis! [font-family:'Roboto_Mono',_monospace]! text-[12px]!">{log.path}</td>
                        <td className="p-[12px_16px]! whitespace-nowrap! [color:var(--color-slate-800)]! [vertical-align:middle]! font-semibold!">{log.user || "Anonymous"}</td>
                        <td className="p-[12px_16px]! whitespace-nowrap! [color:var(--color-slate-800)]! [vertical-align:middle]!">
                          <span
                            className="inline-block! p-[3px_10px]! rounded-[12px]! font-semibold! text-[11px]! tracking-[0.03em]!" style={{
  backgroundColor: sc.bg,
  color: sc.text
}}
                          >
                            {log.status_code}
                          </span>
                        </td>
                        <td
                          className="p-[12px_16px]! whitespace-nowrap! [vertical-align:middle]! font-semibold!" style={{
  color: getLatencyColor(log.response_time_ms)
}}
                        >
                          {log.response_time_ms} ms
                        </td>
                        <td className="p-[12px_16px]! whitespace-nowrap! [color:var(--color-slate-800)]! [vertical-align:middle]!">{log.ip_address || "—"}</td>
                        <td className="p-[12px_16px]! whitespace-nowrap! [color:var(--color-slate-800)]! [vertical-align:middle]!">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="p-[5px_12px]! [background-color:transparent]! [color:var(--color-primary)]! [border:1px_solid_var(--color-primary)]! rounded-[6px]! text-[12px]! font-semibold! cursor-pointer! [transition:all_0.15s_ease]!"
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
        <div className="fixed! [inset:0]! [background-color:rgba(15,_23,_42,_0.45)]! [backdrop-filter:blur(4px)]! flex! justify-center! items-center! z-[1000]!" onClick={() => setSelectedLog(null)}>
          <div className="[background-color:var(--color-white)]! rounded-[14px]! w-[90%]! max-w-[600px]! max-h-[85vh]! overflow-auto! [box-shadow:0_25px_50px_-12px_rgba(0,_0,_0,_0.25)]! [border:1px_solid_var(--color-slate-200)]!" onClick={(e) => e.stopPropagation()}>
            <div className="flex! justify-between! items-center! p-[18px_24px]! [border-bottom:1px_solid_var(--color-slate-200)]!">
              <div className="flex! items-center! gap-[10px]!">
                <span className={"material-symbols-outlined" + " " + "text-[20px]! [color:var(--color-primary)]!"} >
                  speed
                </span>
                <h2 className="m-0! text-[17px]! font-bold! [color:var(--color-slate-900)]!">Request Details</h2>
              </div>
              <button onClick={() => setSelectedLog(null)} className="[background:none]! border-0! text-[18px]! cursor-pointer! [color:var(--color-slate-400)]! leading-[1]!">
                ✕
              </button>
            </div>
            <div className="p-[20px_24px]!">
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
              <div className="flex! flex-col! p-[12px_0]! [border-bottom:1px_solid_var(--color-slate-100)]! gap-[4px]!">
                <span className="text-[12px]! font-semibold! [color:var(--color-slate-500)]! [text-transform:uppercase]! tracking-[0.04em]!">User Agent</span>
                <span
                  className="text-[12px]! [color:var(--color-slate-900)]! leading-[1.5]! [word-break:break-all]!"
                >
                  {selectedLog.user_agent || "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </MonitoringLayout>
  );
}

// ── Small helper components ──────────────────────────────────────────

function MetricCard({ label, value, icon, iconBg, iconColor }) {
  return (
    <div className="[background-color:var(--color-white)]! rounded-[12px]! p-[18px_20px]! [border:1px_solid_var(--color-slate-200)]! [box-shadow:0_1px_3px_rgba(0,_0,_0,_0.04)]!">
      <div className="flex! justify-between! items-start!">
        <div>
          <div className="text-[12px]! font-semibold! [color:var(--color-slate-500)]! [text-transform:uppercase]! tracking-[0.04em]!">{label}</div>
          <div className="text-[26px]! font-extrabold! [color:var(--color-slate-900)]! mt-[4px]!">{value}</div>
        </div>
        <div className="w-[44px]! h-[44px]! rounded-[10px]! flex! items-center! justify-center!" style={{
  backgroundColor: iconBg,
  color: iconColor
}}>
          <span className={"material-symbols-outlined" + " " + "text-[24px]!"} >
            {icon}
          </span>
        </div>
      </div>
    </div>
  );
}
