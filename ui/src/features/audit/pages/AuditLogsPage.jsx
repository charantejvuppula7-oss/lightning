import Paginator from '../Paginator.jsx'

import useLogHistory from '../hooks/useLogHistory.js'
import DetailRow from '../LogDetailRow.jsx'
import { formatLogDate as fmtDate } from '../logFormat.js'
import { MonitoringLayout } from "../../../layouts/Loading.jsx";
import DatePicker from "../../../shared/components/DatePicker.jsx";
import Navbar from "../../../layouts/Navbar.jsx";
import { FilterSelect, SearchBar } from "../../../shared/components/SearchControls.jsx";

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
    <MonitoringLayout user={user}>

      {/* Sidebar — Admin or PM depending on route */}

      {/* Main Container */}
      <div className="flex-1! flex! flex-col! min-w-0! h-screen! overflow-y-auto!">
        {/* Top Navbar */}
        <Navbar user={user} />

        {/* Page Body */}
        <div className="p-[24px_32px]! flex-1!">
          {/* ── Title Row ─────────────────────────────────────────────── */}
          <div className="flex! items-center! justify-between! mb-[18px]!">
            <div>
              <h1 className="text-[18px]! font-bold! [color:var(--color-slate-900)]! m-0! tracking-[-0.2px]!">Audit Logs</h1>
              <span className="text-[12px]! [color:var(--color-slate-500)]! mt-[3px]! block!">Security audit trail & activity history</span>
            </div>
            <div className="flex! items-center! gap-[14px]!">
              <label className="text-[13px]! [color:var(--color-slate-600)]! flex! items-center! cursor-pointer!">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={() => setAutoRefresh(!autoRefresh)}
                  className="mr-[6px]! [accent-color:var(--color-primary)]! cursor-pointer!"
                />
                Auto-refresh (10s)
              </label>
              <button
                type="button"
                onClick={() => fetchLogs(pagination.page)}
                className="flex! items-center! gap-[6px]! p-[6px_14px]! h-[34px]! [background-color:var(--color-white)]! [border:1px_solid_var(--color-slate-300)]! rounded-[8px]! text-[13px]! font-medium! [color:var(--color-slate-700)]! cursor-pointer! [transition:all_0.15s_ease]!"
                title="Refresh"
              >
                <span className={"material-symbols-outlined" + " " + "text-[16px]!"} >
                  refresh
                </span>
                Refresh
              </button>
            </div>
          </div>

          {/* ── Filters ───────────────────────────────────────────────── */}
          <form onSubmit={handleSearch} className="flex! gap-[10px]! flex-wrap! mb-[20px]! items-center!">
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
            <button type="submit" className="h-[38px]! p-[0_22px]! [background-color:var(--color-primary)]! [color:var(--color-white)]! border-0! rounded-[8px]! font-semibold! text-[13px]! cursor-pointer! [box-shadow:0_1px_2px_rgba(37,_99,_235,_0.15)]! [transition:background-color_0.15s_ease]!">
              Apply
            </button>
            <button type="button" onClick={clearFilters} className="h-[38px]! p-[0_18px]! [background-color:var(--color-white)]! [color:var(--color-slate-700)]! [border:1px_solid_var(--color-slate-300)]! rounded-[8px]! font-medium! text-[13px]! cursor-pointer! [transition:background-color_0.15s_ease]!">
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
                    <th className="p-[12px_16px]! [background-color:var(--color-slate-50)]! [border-bottom:1px_solid_var(--color-slate-200)]! [color:var(--color-slate-600)]! font-semibold! text-[11px]! [text-transform:uppercase]! tracking-[0.04em]! whitespace-nowrap!">User</th>
                    <th className="p-[12px_16px]! [background-color:var(--color-slate-50)]! [border-bottom:1px_solid_var(--color-slate-200)]! [color:var(--color-slate-600)]! font-semibold! text-[11px]! [text-transform:uppercase]! tracking-[0.04em]! whitespace-nowrap!">Action</th>
                    <th className="p-[12px_16px]! [background-color:var(--color-slate-50)]! [border-bottom:1px_solid_var(--color-slate-200)]! [color:var(--color-slate-600)]! font-semibold! text-[11px]! [text-transform:uppercase]! tracking-[0.04em]! whitespace-nowrap!">Entity Type</th>
                    <th className="p-[12px_16px]! [background-color:var(--color-slate-50)]! [border-bottom:1px_solid_var(--color-slate-200)]! [color:var(--color-slate-600)]! font-semibold! text-[11px]! [text-transform:uppercase]! tracking-[0.04em]! whitespace-nowrap!">Entity Name</th>
                    <th className="p-[12px_16px]! [background-color:var(--color-slate-50)]! [border-bottom:1px_solid_var(--color-slate-200)]! [color:var(--color-slate-600)]! font-semibold! text-[11px]! [text-transform:uppercase]! tracking-[0.04em]! whitespace-nowrap! w-full!">Description</th>
                    <th className="p-[12px_16px]! [background-color:var(--color-slate-50)]! [border-bottom:1px_solid_var(--color-slate-200)]! [color:var(--color-slate-600)]! font-semibold! text-[11px]! [text-transform:uppercase]! tracking-[0.04em]! whitespace-nowrap!">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 && !loading && (
                    <tr>
                      <td colSpan={7} className="text-center! p-[40px]! [color:var(--color-slate-400)]! text-[14px]!">
                        No audit logs found.
                      </td>
                    </tr>
                  )}
                  {logs.map((log) => {
                    const ac = ACTION_COLORS[log.action] || { bg: "var(--color-slate-100)", text: "var(--color-slate-600)" };
                    const ec = ENTITY_COLORS[log.entity_type] || { bg: "var(--color-slate-100)", text: "var(--color-slate-600)" };
                    return (
                      <tr key={log.id} className={"audit-row" + " " + "[border-bottom:1px_solid_var(--color-slate-100)]! [transition:background-color_0.12s_ease]!"} >
                        <td className="p-[12px_16px]! whitespace-nowrap! [color:var(--color-slate-800)]! [vertical-align:middle]!">{fmtDate(log.timestamp)}</td>
                        <td className="p-[12px_16px]! whitespace-nowrap! [color:var(--color-slate-800)]! [vertical-align:middle]! font-semibold!">{log.user}</td>
                        <td className="p-[12px_16px]! whitespace-nowrap! [color:var(--color-slate-800)]! [vertical-align:middle]!">
                          <span
                            className="inline-block! p-[4px_10px]! rounded-[12px]! font-semibold! text-[11px]! tracking-[0.03em]! [text-transform:capitalize]!" style={{
  backgroundColor: ac.bg,
  color: ac.text
}}
                          >
                            {log.action.replace("_", " ")}
                          </span>
                        </td>
                        <td className="p-[12px_16px]! whitespace-nowrap! [color:var(--color-slate-800)]! [vertical-align:middle]!">
                          <span
                            className="inline-block! p-[4px_10px]! rounded-[12px]! font-semibold! text-[11px]! tracking-[0.03em]! [text-transform:capitalize]!" style={{
  backgroundColor: ec.bg,
  color: ec.text
}}
                          >
                            {log.entity_type.replace("_", " ")}
                          </span>
                        </td>
                        <td className="p-[12px_16px]! [white-space:normal]! [color:var(--color-slate-800)]! [vertical-align:middle]! max-w-[180px]! overflow-hidden! text-ellipsis! font-medium!">{log.entity_name || "—"}</td>
                        <td className="p-[12px_16px]! [white-space:normal]! [color:var(--color-slate-800)]! [vertical-align:middle]! max-w-[320px]! overflow-hidden! text-ellipsis!">{log.description}</td>
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
          <div className="[background-color:var(--color-white)]! rounded-[14px]! w-[90%]! max-w-[640px]! max-h-[85vh]! overflow-auto! [box-shadow:0_25px_50px_-12px_rgba(0,_0,_0,_0.25)]! [border:1px_solid_var(--color-slate-200)]!" onClick={(e) => e.stopPropagation()}>
            <div className="flex! justify-between! items-center! p-[18px_24px]! [border-bottom:1px_solid_var(--color-slate-200)]!">
              <div className="flex! items-center! gap-[10px]!">
                <span className={"material-symbols-outlined" + " " + "text-[20px]! [color:var(--color-primary)]!"} >
                  history
                </span>
                <h2 className="m-0! text-[17px]! font-bold! [color:var(--color-slate-900)]!">Audit Log Details</h2>
              </div>
              <button onClick={() => setSelectedLog(null)} className="[background:none]! border-0! text-[18px]! cursor-pointer! [color:var(--color-slate-400)]! leading-[1]!">
                ✕
              </button>
            </div>
            <div className="p-[20px_24px]!">
              <DetailRow label="Timestamp" value={fmtDate(selectedLog.timestamp)} />
              <DetailRow label="User" value={selectedLog.user} />
              <DetailRow label="Action" value={selectedLog.action} />
              <DetailRow label="Entity Type" value={selectedLog.entity_type} />
              <DetailRow label="Entity ID" value={selectedLog.entity_id || "—"} />
              <DetailRow label="Entity Name" value={selectedLog.entity_name || "—"} />
              <DetailRow label="Description" value={selectedLog.description} />
              <DetailRow label="Request Path" value={selectedLog.request_path || "—"} />
              <DetailRow label="IP Address" value={selectedLog.ip_address || "—"} />
              <div className="flex! flex-col! p-[12px_0]! [border-bottom:1px_solid_var(--color-slate-100)]! gap-[4px]!">
                <span className="text-[12px]! font-semibold! [color:var(--color-slate-500)]! [text-transform:uppercase]! tracking-[0.04em]!">Context</span>
                <span className="text-[14px]! [color:var(--color-slate-900)]! leading-[1.5]!">
                  <pre className="m-[8px_0_0]! p-[12px]! [background-color:var(--color-slate-50)]! [border:1px_solid_var(--color-slate-200)]! rounded-[8px]! [font-family:'Roboto_Mono',_monospace]! text-[12px]! overflow-x-auto! [color:var(--color-slate-700)]! text-left!">
                    {JSON.stringify(selectedLog.context, null, 2)}
                  </pre>
                </span>
              </div>
              {(selectedLog.old_values || selectedLog.new_values) && (
                <>
                  <div className="flex! flex-col! p-[12px_0]! [border-bottom:1px_solid_var(--color-slate-100)]! gap-[4px]!">
                    <span className="text-[12px]! font-semibold! [color:var(--color-slate-500)]! [text-transform:uppercase]! tracking-[0.04em]!">Old Values</span>
                    <span className="text-[14px]! [color:var(--color-slate-900)]! leading-[1.5]!">
                      <pre className="m-[8px_0_0]! p-[12px]! [background-color:var(--color-slate-50)]! [border:1px_solid_var(--color-slate-200)]! rounded-[8px]! [font-family:'Roboto_Mono',_monospace]! text-[12px]! overflow-x-auto! [color:var(--color-slate-700)]! text-left!">
                        {JSON.stringify(selectedLog.old_values, null, 2)}
                      </pre>
                    </span>
                  </div>
                  <div className="flex! flex-col! p-[12px_0]! [border-bottom:1px_solid_var(--color-slate-100)]! gap-[4px]!">
                    <span className="text-[12px]! font-semibold! [color:var(--color-slate-500)]! [text-transform:uppercase]! tracking-[0.04em]!">New Values</span>
                    <span className="text-[14px]! [color:var(--color-slate-900)]! leading-[1.5]!">
                      <pre className="m-[8px_0_0]! p-[12px]! [background-color:var(--color-slate-50)]! [border:1px_solid_var(--color-slate-200)]! rounded-[8px]! [font-family:'Roboto_Mono',_monospace]! text-[12px]! overflow-x-auto! [color:var(--color-slate-700)]! text-left!">
                        {JSON.stringify(selectedLog.new_values, null, 2)}
                      </pre>
                    </span>
                  </div>
                </>
              )}
              <div className="flex! flex-col! p-[12px_0]! [border-bottom:1px_solid_var(--color-slate-100)]! gap-[4px]!">
                <span className="text-[12px]! font-semibold! [color:var(--color-slate-500)]! [text-transform:uppercase]! tracking-[0.04em]!">User Agent</span>
                <span
                  className="text-[12px]! [color:var(--color-slate-900)]! leading-[1.5]! [word-break:break-all]! text-left!"
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
