import { useState, useEffect, useCallback } from 'react'
import { getAuditLogs } from '../api/adminApi.js'
import AdminTable from '../components/AdminTable.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Paginator from '../components/Paginator.jsx'

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
  { key: 'entity_type', label: 'Entity Type', render: (v) => <span className="admin-badge admin-badge-neutral">{v}</span> },
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
    <div className="page-content">
      <div className="page-heading">
        <h1>Audit Logs</h1>
        <p>Immutable record of every user action performed in the system.</p>

        <form className="admin-filters" onSubmit={applyFilters}>
          <select
            className="admin-select"
            value={draft.action}
            onChange={(e) => setDraft((d) => ({ ...d, action: e.target.value }))}
          >
            <option value="">All Actions</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select
            className="admin-select"
            value={draft.entity_type}
            onChange={(e) => setDraft((d) => ({ ...d, entity_type: e.target.value }))}
          >
            <option value="">All Entities</option>
            {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            className="admin-input"
            placeholder="Username contains…"
            value={draft.user}
            onChange={(e) => setDraft((d) => ({ ...d, user: e.target.value }))}
          />
          <button type="submit" className="admin-btn">Apply</button>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={clearFilters}>Clear</button>
        </form>
      </div>

      <div className="admin-meta">
        {!loading && <span>{total.toLocaleString()} records</span>}
      </div>

      <AdminTable columns={COLUMNS} rows={rows} loading={loading} error={error} />
      <Paginator page={page} totalPages={totalPages} onPage={setPage} />
    </div>
  )
}
