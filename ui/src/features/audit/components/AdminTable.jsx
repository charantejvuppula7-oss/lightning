

/* styling */
const tailwindStyling = {
  "admin-table-wrap": [
    "[overflow-x:auto]",
    "[border:1px_solid_var(--color-slate-200)]",
    "[border-radius:10px]",
    "[background:var(--color-white)]"
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
  "admin-table-empty": [
    "[text-align:center]",
    "[color:var(--color-slate-400)]",
    "[padding:32px]"
  ]
}
const styling = value => {
  const classes = typeof value === 'string' ? value : ''
  const utilities = classes.split(/\s+/).flatMap(name => tailwindStyling[name] || [])
  return [...new Set([...classes.split(/\s+/), ...utilities])].filter(Boolean).join(' ')
}

/**
 * AdminTable — reusable paginated data table for admin pages.
 *
 * Props:
 *   columns  – Array<{ key, label, render? }>
 *   rows     – Array<object>
 *   loading  – boolean
 *   error    – string | null
 *   emptyMsg – string (shown when rows is empty)
 */
export default function AdminTable({ columns, rows, loading, error, emptyMsg = 'No records found.' }) {
  if (loading) return <div className={styling("admin-table-state")}>Loading…</div>
  if (error)   return <div className={styling("admin-table-state admin-table-error")}>{error}</div>

  return (
    <div className={styling("admin-table-wrap")}>
      <table className={styling("admin-table")}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styling("admin-table-empty")}>{emptyMsg}</td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={row.id ?? i}>
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
