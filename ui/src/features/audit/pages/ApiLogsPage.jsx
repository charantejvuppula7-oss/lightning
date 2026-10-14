import { useState, useEffect, useCallback } from 'react'
import { getApiLogs } from '../api/adminApi.js'
import AdminTable from '../components/AdminTable.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Paginator from '../components/Paginator.jsx'

/* styling */
const tailwindStyling = {
  "page-content": [
    "[padding:28px]",
    "max-[600px]:[padding:16px]"
  ],
  "page-heading": [
    "[background:white]",
    "[border:1px_solid_#e5e6eb]",
    "[border-radius:12px]",
    "[padding:19px_22px_0]",
    "[margin-bottom:20px]",
    "[&_h1]:[margin:0]",
    "[&_h1]:[font-size:28px]",
    "[&_h1]:[line-height:1.25]",
    "[&_h1]:[letter-spacing:-.4px]",
    "[&_h1]:[color:#172033]",
    "[&_p]:[margin:4px_0_0]",
    "[&_p]:[font-size:14px]",
    "[&_p]:[color:#737986]"
  ],
  "admin-filters": [
    "[display:flex]",
    "[flex-wrap:wrap]",
    "[gap:8px]",
    "[margin-top:16px]",
    "[margin-bottom:4px]"
  ],
  "admin-input": [
    "[height:34px]",
    "[border:1px_solid_var(--color-slate-200)]",
    "[border-radius:6px]",
    "[padding:0_10px]",
    "[font:inherit]",
    "[font-size:13px]",
    "[color:var(--color-slate-900)]",
    "[background:var(--color-white)]",
    "[min-width:140px]",
    "[&:focus]:[outline:2px_solid_var(--color-primary)]",
    "[&:focus]:[outline-offset:2px]",
    "[&:focus]:[border-color:var(--color-primary)]"
  ],
  "admin-input-wide": [
    "[min-width:220px]"
  ],
  "admin-select": [
    "[height:34px]",
    "[border:1px_solid_var(--color-slate-200)]",
    "[border-radius:6px]",
    "[padding:0_10px]",
    "[font:inherit]",
    "[font-size:13px]",
    "[color:var(--color-slate-900)]",
    "[background:var(--color-white)]",
    "[cursor:pointer]",
    "[&:focus]:[outline:2px_solid_var(--color-primary)]",
    "[&:focus]:[outline-offset:2px]"
  ],
  "admin-btn": [
    "[height:34px]",
    "[padding:0_16px]",
    "[border:none]",
    "[border-radius:6px]",
    "[background:var(--color-primary)]",
    "[color:#fff]",
    "[font:inherit]",
    "[font-size:13px]",
    "[font-weight:600]",
    "[cursor:pointer]",
    "[&:hover]:[background:var(--color-primary-hover)]"
  ],
  "admin-btn-ghost": [
    "[background:var(--color-slate-100)]",
    "[color:var(--color-slate-600)]",
    "[&:hover]:[background:var(--color-slate-200)]",
    "[&:hover]:[color:var(--color-slate-900)]"
  ],
  "admin-meta": [
    "[font-size:12px]",
    "[color:var(--color-slate-500)]",
    "[padding:8px_0_4px]"
  ],
  "admin-code": [
    "[font-family:'Consolas','Menlo',monospace]",
    "[font-size:12px]",
    "[background:var(--color-slate-100)]",
    "[padding:2px_5px]",
    "[border-radius:4px]"
  ]
}
const styling = value => {
  const classes = typeof value === 'string' ? value : ''
  const utilities = classes.split(/\s+/).flatMap(name => tailwindStyling[name] || [])
  return [...new Set([...classes.split(/\s+/), ...utilities])].filter(Boolean).join(' ')
}



const PAGE_SIZE = 50

const COLUMNS = [
  { key: 'created_at',       label: 'Time',         render: (v) => fmtDate(v) },
  { key: 'method',           label: 'Method',       render: (v) => <StatusBadge value={v} type="method" /> },
  { key: 'path',             label: 'Path',         render: (v) => <code className={styling("admin-code")}>{v}</code> },
  { key: 'status_code',      label: 'Status',       render: (v) => <StatusBadge value={v} type="status" /> },
  { key: 'response_time_ms', label: 'Duration (ms)',render: (v) => `${Number(v).toFixed(1)}` },
  { key: 'user_name',        label: 'User' },
  { key: 'ip_address',       label: 'IP' },
]

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', { hour12: false })
}

export default function ApiLogsPage() {
  const [rows, setRows]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [page, setPage]         = useState(1)
  const [total, setTotal]       = useState(0)
  const [filters, setFilters]   = useState({ method: '', status: '', path: '' })
  const [draft, setDraft]       = useState({ method: '', status: '', path: '' })

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const load = useCallback(async (p, f) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getApiLogs({ page: p, page_size: PAGE_SIZE, ...f })
      setRows(data.results ?? [])
      setTotal(data.count ?? 0)
    } catch {
      setError('Failed to load API logs. Make sure you are signed in as Administrator.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(page, filters) }, [page, filters, load])

  function applyFilters(e) {
    e.preventDefault()
    setPage(1)
    setFilters({ ...draft })
  }

  function clearFilters() {
    const empty = { method: '', status: '', path: '' }
    setDraft(empty)
    setFilters(empty)
    setPage(1)
  }

  return (
    <div className={styling("page-content")}>
      <div className={styling("page-heading")}>
        <h1>API Logs</h1>
        <p>Every HTTP request captured by the API logging middleware.</p>

        <form className={styling("admin-filters")} onSubmit={applyFilters}>
          <select
            className={styling("admin-select")}
            value={draft.method}
            onChange={(e) => setDraft((d) => ({ ...d, method: e.target.value }))}
          >
            <option value="">All Methods</option>
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <input
            className={styling("admin-input")}
            placeholder="Status code (e.g. 404)"
            value={draft.status}
            onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
          />
          <input
            className={styling("admin-input admin-input-wide")}
            placeholder="Path contains…"
            value={draft.path}
            onChange={(e) => setDraft((d) => ({ ...d, path: e.target.value }))}
          />
          <button type="submit" className={styling("admin-btn")}>Apply</button>
          <button type="button" className={styling("admin-btn admin-btn-ghost")} onClick={clearFilters}>Clear</button>
        </form>
      </div>

      <div className={styling("admin-meta")}>
        {!loading && <span>{total.toLocaleString()} records</span>}
      </div>

      <AdminTable columns={COLUMNS} rows={rows} loading={loading} error={error} />
      <Paginator page={page} totalPages={totalPages} onPage={setPage} />
    </div>
  )
}
