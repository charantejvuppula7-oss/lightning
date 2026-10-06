import { useState, useEffect, useCallback } from 'react'
import { getApiLogs } from '../api/adminApi.js'
import AdminTable from '../components/AdminTable.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Paginator from '../components/Paginator.jsx'

const PAGE_SIZE = 50

const COLUMNS = [
  { key: 'created_at',       label: 'Time',         render: (v) => fmtDate(v) },
  { key: 'method',           label: 'Method',       render: (v) => <StatusBadge value={v} type="method" /> },
  { key: 'path',             label: 'Path',         render: (v) => <code className="admin-code">{v}</code> },
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
    <div className="page-content">
      <div className="page-heading">
        <h1>API Logs</h1>
        <p>Every HTTP request captured by the API logging middleware.</p>

        <form className="admin-filters" onSubmit={applyFilters}>
          <select
            className="admin-select"
            value={draft.method}
            onChange={(e) => setDraft((d) => ({ ...d, method: e.target.value }))}
          >
            <option value="">All Methods</option>
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <input
            className="admin-input"
            placeholder="Status code (e.g. 404)"
            value={draft.status}
            onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
          />
          <input
            className="admin-input admin-input-wide"
            placeholder="Path contains…"
            value={draft.path}
            onChange={(e) => setDraft((d) => ({ ...d, path: e.target.value }))}
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
