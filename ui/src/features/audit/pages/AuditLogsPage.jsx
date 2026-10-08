import { useState, useEffect, useCallback } from 'react'
import { getAuditLogs } from '../api/adminApi.js'
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
  "admin-badge": [
    "[display:inline-block]",
    "[padding:2px_8px]",
    "[border-radius:20px]",
    "[font-size:11px]",
    "[font-weight:700]",
    "[text-transform:uppercase]",
    "[letter-spacing:.04em]",
    "[white-space:nowrap]"
  ],
  "admin-badge-neutral": [
    "[background:var(--color-slate-100)]",
    "[color:var(--color-slate-600)]"
  ]
}
const styling = value => {
  const classes = typeof value === 'string' ? value : ''
  const utilities = classes.split(/\s+/).flatMap(name => tailwindStyling[name] || [])
  return [...new Set([...classes.split(/\s+/), ...utilities])].filter(Boolean).join(' ')
}



const PAGE_SIZE = 50

const ACTIONS = [
  'login', 'login_failed', 'logout', 'created', 'updated', 'deleted',
  'completed', 'status_changed', 'uploaded', 'downloaded', 'assigned',
  'reassigned', 'reordered', 'access_denied', 'timer_paused', 'timer_resumed',
]

const ENTITY_TYPES = [
  'project', 'task', 'sprint', 'milestone', 'feature',
  'resource_file', 'user_account', 'role', 'dependency', 'session',
]

const COLUMNS = [
  { key: 'timestamp',   label: 'Time',        render: (v) => fmtDate(v) },
  { key: 'user_name',   label: 'User' },
  { key: 'action',      label: 'Action',      render: (v) => <StatusBadge value={v} type="action" /> },
  { key: 'entity_type', label: 'Entity Type', render: (v) => <span className={styling("admin-badge admin-badge-neutral")}>{v}</span> },
  { key: 'entity_name', label: 'Entity',      render: (v) => v || '—' },
  { key: 'description', label: 'Description', render: (v) => <span title={v}>{truncate(v, 60)}</span> },
  { key: 'ip_address',  label: 'IP' },
]

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', { hour12: false })
}

function truncate(str, n) {
  if (!str) return '—'
  return str.length > n ? str.slice(0, n) + '…' : str
}

export default function AuditLogsPage() {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [page, setPage]       = useState(1)
  const [total, setTotal]     = useState(0)
  const [filters, setFilters] = useState({ action: '', entity_type: '', user: '' })
  const [draft, setDraft]     = useState({ action: '', entity_type: '', user: '' })

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const load = useCallback(async (p, f) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAuditLogs({ page: p, page_size: PAGE_SIZE, ...f })
      setRows(data.results ?? [])
      setTotal(data.count ?? 0)
    } catch {
      setError('Failed to load audit logs. Make sure you are signed in as Administrator.')
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
    const empty = { action: '', entity_type: '', user: '' }
    setDraft(empty)
    setFilters(empty)
    setPage(1)
  }

  return (
    <div className={styling("page-content")}>
      <div className={styling("page-heading")}>
        <h1>Audit Logs</h1>
        <p>Immutable record of every user action performed in the system.</p>

        <form className={styling("admin-filters")} onSubmit={applyFilters}>
          <select
            className={styling("admin-select")}
            value={draft.action}
            onChange={(e) => setDraft((d) => ({ ...d, action: e.target.value }))}
          >
            <option value="">All Actions</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select
            className={styling("admin-select")}
            value={draft.entity_type}
            onChange={(e) => setDraft((d) => ({ ...d, entity_type: e.target.value }))}
          >
            <option value="">All Entities</option>
            {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            className={styling("admin-input")}
            placeholder="Username contains…"
            value={draft.user}
            onChange={(e) => setDraft((d) => ({ ...d, user: e.target.value }))}
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
