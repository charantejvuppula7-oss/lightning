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
  if (loading) return <div className="admin-table-state">Loading…</div>
  if (error)   return <div className="admin-table-state admin-table-error">{error}</div>

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
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
              <td colSpan={columns.length} className="admin-table-empty">{emptyMsg}</td>
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
