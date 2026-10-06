import { useState, useEffect } from 'react'
import { getDbTables, getDbTableDetail } from '../api/adminApi.js'
import AdminTable from '../components/AdminTable.jsx'

export default function DatabaseExplorerPage() {
  const [tables, setTables]         = useState([])
  const [tablesLoading, setTablesLoading] = useState(true)
  const [tablesError, setTablesError]     = useState(null)

  const [selected, setSelected]     = useState(null)
  const [detail, setDetail]         = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError]     = useState(null)

  const [search, setSearch]         = useState('')

  // Load table list on mount
  useEffect(() => {
    setTablesLoading(true)
    getDbTables()
      .then((data) => setTables(data.tables ?? []))
      .catch(() => setTablesError('Failed to load database tables.'))
      .finally(() => setTablesLoading(false))
  }, [])

  // Load table detail when selection changes
  useEffect(() => {
    if (!selected) return
    setDetailLoading(true)
    setDetailError(null)
    setDetail(null)
    getDbTableDetail(selected)
      .then(setDetail)
      .catch(() => setDetailError(`Failed to load table "${selected}".`))
      .finally(() => setDetailLoading(false))
  }, [selected])

  const filteredTables = tables.filter((t) =>
    t.table.toLowerCase().includes(search.toLowerCase())
  )

  // Build dynamic columns from table schema
  const detailColumns = detail?.columns?.map((col) => ({
    key: col,
    label: col,
    render: (v) => {
      if (v === null || v === undefined) return <span className="admin-null">NULL</span>
      const s = String(v)
      return <span title={s}>{s.length > 80 ? s.slice(0, 80) + '…' : s}</span>
    },
  })) ?? []

  return (
    <div className="page-content">
      <div className="page-heading">
        <h1>Database Explorer</h1>
        <p>Browse all database tables and their rows. Read-only view — first {detail?.capped ? '100' : detail?.row_count ?? '…'} rows per table.</p>
      </div>

      <div className="db-explorer-layout">
        {/* Left: table list */}
        <aside className="db-table-list">
          <input
            className="admin-input"
            placeholder="Search tables…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          {tablesLoading && <div className="admin-table-state">Loading…</div>}
          {tablesError  && <div className="admin-table-state admin-table-error">{tablesError}</div>}
          {filteredTables.map(({ table, row_count }) => (
            <button
              key={table}
              type="button"
              className={`db-table-item${selected === table ? ' db-table-item-active' : ''}`}
              onClick={() => setSelected(table)}
            >
              <span className="db-table-name">{table}</span>
              {row_count !== null && (
                <span className="db-table-count">{row_count.toLocaleString()}</span>
              )}
            </button>
          ))}
        </aside>

        {/* Right: table data */}
        <div className="db-table-detail">
          {!selected && (
            <div className="admin-table-state">← Select a table to explore its rows.</div>
          )}
          {selected && (
            <>
              <div className="db-detail-header">
                <strong>{selected}</strong>
                {detail && (
                  <span className="admin-meta-text">
                    {detail.row_count} row{detail.row_count !== 1 ? 's' : ''} shown
                    {detail.capped ? ' (capped at 100)' : ''}
                  </span>
                )}
              </div>
              <AdminTable
                columns={detailColumns}
                rows={detail?.rows ?? []}
                loading={detailLoading}
                error={detailError}
                emptyMsg="This table has no rows."
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
