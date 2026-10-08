import { useState, useEffect } from 'react'
import { getDbTables, getDbTableDetail } from '../api/adminApi.js'
import AdminTable from '../components/AdminTable.jsx'

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
  "admin-meta": [
    "[font-size:12px]",
    "[color:var(--color-slate-500)]",
    "[padding:8px_0_4px]"
  ],
  "admin-meta-text": [
    "[font-size:12px]",
    "[color:var(--color-slate-500)]"
  ],
  "admin-table": [
    "[width:100%]",
    "[border-collapse:collapse]",
    "[font-size:13px]",
    "[&_thead_tr]:[background:var(--color-slate-50)]",
    "[&_thead_tr]:[border-bottom:1px_solid_var(--color-slate-200)]",
    "[&_th]:[padding:10px_14px]",
    "[&_th]:[text-align:left]",
    "[&_th]:[font-size:11px]",
    "[&_th]:[font-weight:700]",
    "[&_th]:[text-transform:uppercase]",
    "[&_th]:[letter-spacing:.05em]",
    "[&_th]:[color:var(--color-slate-500)]",
    "[&_th]:[white-space:nowrap]",
    "[&_td]:[padding:10px_14px]",
    "[&_td]:[border-bottom:1px_solid_var(--color-slate-100)]",
    "[&_td]:[color:#374151]",
    "[&_td]:[white-space:nowrap]",
    "[&_td]:[max-width:320px]",
    "[&_td]:[overflow:hidden]",
    "[&_td]:[text-overflow:ellipsis]",
    "[&_tr:last-child_td]:[border-bottom:none]",
    "[&_tbody_tr:hover_td]:[background:var(--color-slate-50)]"
  ],
  "admin-table-state": [
    "[padding:32px]",
    "[text-align:center]",
    "[color:var(--color-slate-400)]",
    "[font-size:14px]"
  ],
  "admin-table-error": [
    "[color:#dc2626]"
  ],
  "admin-null": [
    "[color:var(--color-slate-400)]",
    "[font-style:italic]",
    "[font-size:12px]"
  ],
  "db-explorer-layout": [
    "[display:grid]",
    "[grid-template-columns:240px_1fr]",
    "[gap:16px]",
    "[margin-top:16px]",
    "[align-items:start]",
    "max-[900px]:[grid-template-columns:1fr]"
  ],
  "db-table-list": [
    "[background:var(--color-white)]",
    "[border:1px_solid_var(--color-slate-200)]",
    "[border-radius:10px]",
    "[padding:10px]",
    "[max-height:calc(100vh_-_220px)]",
    "[overflow-y:auto]",
    "[display:flex]",
    "[flex-direction:column]",
    "[gap:2px]",
    "max-[900px]:[max-height:200px]"
  ],
  "db-table-item": [
    "[width:100%]",
    "[display:flex]",
    "[justify-content:space-between]",
    "[align-items:center]",
    "[gap:8px]",
    "[padding:8px_10px]",
    "[border:none]",
    "[border-radius:6px]",
    "[background:transparent]",
    "[text-align:left]",
    "[font:inherit]",
    "[font-size:13px]",
    "[color:#374151]",
    "[cursor:pointer]",
    "[&:hover]:[background:var(--color-slate-50)]"
  ],
  "db-table-item-active": [
    "[background:var(--color-primary-subtle)]",
    "[color:var(--color-primary)]",
    "[font-weight:600]"
  ],
  "db-table-name": [
    "[min-width:0]",
    "[overflow:hidden]",
    "[text-overflow:ellipsis]",
    "[white-space:nowrap]",
    "[font-family:'Consolas',monospace]",
    "[font-size:12px]"
  ],
  "db-table-count": [
    "[flex:0_0_auto]",
    "[font-size:11px]",
    "[color:var(--color-slate-400)]"
  ],
  "db-table-detail": [
    "[min-width:0]"
  ],
  "db-detail-header": [
    "[display:flex]",
    "[align-items:center]",
    "[justify-content:space-between]",
    "[gap:12px]",
    "[padding:0_0_10px]",
    "[font-size:14px]",
    "[font-weight:600]",
    "[color:var(--color-slate-900)]"
  ]
}
const styling = value => {
  const classes = typeof value === 'string' ? value : ''
  const utilities = classes.split(/\s+/).flatMap(name => tailwindStyling[name] || [])
  return [...new Set([...classes.split(/\s+/), ...utilities])].filter(Boolean).join(' ')
}



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
      if (v === null || v === undefined) return <span className={styling("admin-null")}>NULL</span>
      const s = String(v)
      return <span title={s}>{s.length > 80 ? s.slice(0, 80) + '…' : s}</span>
    },
  })) ?? []

  return (
    <div className={styling("page-content")}>
      <div className={styling("page-heading")}>
        <h1>Database Explorer</h1>
        <p>Browse all database tables and their rows. Read-only view — first {detail?.capped ? '100' : detail?.row_count ?? '…'} rows per table.</p>
      </div>

      <div className={styling("db-explorer-layout")}>
        {/* Left: table list */}
        <aside className={styling("db-table-list")}>
          <input
            className={styling("admin-input")}
            placeholder="Search tables…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          {tablesLoading && <div className={styling("admin-table-state")}>Loading…</div>}
          {tablesError  && <div className={styling("admin-table-state admin-table-error")}>{tablesError}</div>}
          {filteredTables.map(({ table, row_count }) => (
            <button
              key={table}
              type="button"
              className={styling(`db-table-item${selected === table ? ' db-table-item-active' : ''}`)}
              onClick={() => setSelected(table)}
            >
              <span className={styling("db-table-name")}>{table}</span>
              {row_count !== null && (
                <span className={styling("db-table-count")}>{row_count.toLocaleString()}</span>
              )}
            </button>
          ))}
        </aside>

        {/* Right: table data */}
        <div className={styling("db-table-detail")}>
          {!selected && (
            <div className={styling("admin-table-state")}>← Select a table to explore its rows.</div>
          )}
          {selected && (
            <>
              <div className={styling("db-detail-header")}>
                <strong>{selected}</strong>
                {detail && (
                  <span className={styling("admin-meta-text")}>
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
