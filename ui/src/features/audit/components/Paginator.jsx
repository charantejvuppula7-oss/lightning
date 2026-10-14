

/* styling */
const tailwindStyling = {
  "admin-paginator": [
    "[display:flex]",
    "[align-items:center]",
    "[gap:12px]",
    "[padding:14px_0_6px]"
  ],
  "admin-page-btn": [
    "[height:32px]",
    "[padding:0_14px]",
    "[border:1px_solid_var(--color-slate-200)]",
    "[border-radius:6px]",
    "[background:var(--color-white)]",
    "[color:#374151]",
    "[font:inherit]",
    "[font-size:13px]",
    "[cursor:pointer]",
    "[&:disabled]:[opacity:.4]",
    "[&:disabled]:[cursor:not-allowed]",
    "[&:not(:disabled):hover]:[background:var(--color-slate-50)]"
  ],
  "admin-page-info": [
    "[font-size:13px]",
    "[color:var(--color-slate-500)]"
  ]
}
const styling = value => {
  const classes = typeof value === 'string' ? value : ''
  const utilities = classes.split(/\s+/).flatMap(name => tailwindStyling[name] || [])
  return [...new Set([...classes.split(/\s+/), ...utilities])].filter(Boolean).join(' ')
}

/**
 * Pagination controls used at the bottom of admin data tables.
 *
 * Props:
 *   page      – current 1-indexed page
 *   totalPages – total number of pages
 *   onPage    – callback(newPage)
 */
export default function Paginator({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null

  return (
    <div className={styling("admin-paginator")}>
      <button
        type="button"
        className={styling("admin-page-btn")}
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
      >
        ← Prev
      </button>
      <span className={styling("admin-page-info")}>Page {page} of {totalPages}</span>
      <button
        type="button"
        className={styling("admin-page-btn")}
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
      >
        Next →
      </button>
    </div>
  )
}
