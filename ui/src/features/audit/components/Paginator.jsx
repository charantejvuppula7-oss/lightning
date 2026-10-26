import s from './logStyles.js'
export default function Paginator({ pagination, onPage, noun = 'logs' }) {
 if (pagination.total_pages <= 1) return null
 return <div style={s.paginationRow}>
  <span style={s.paginationText}>Page {pagination.page} of {pagination.total_pages} &nbsp;·&nbsp; {pagination.total_count} total {noun}</span>
  <div style={{ display: 'flex', gap: 8 }}>
   <button disabled={pagination.page <= 1} onClick={() => onPage(pagination.page - 1)} style={s.pageBtn}>← Prev</button>
   <button disabled={pagination.page >= pagination.total_pages} onClick={() => onPage(pagination.page + 1)} style={s.pageBtn}>Next →</button>
  </div>
 </div>
}
