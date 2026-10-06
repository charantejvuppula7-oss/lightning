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
    <div className="admin-paginator">
      <button
        type="button"
        className="admin-page-btn"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
      >
        ← Prev
      </button>
      <span className="admin-page-info">Page {page} of {totalPages}</span>
      <button
        type="button"
        className="admin-page-btn"
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
      >
        Next →
      </button>
    </div>
  )
}
