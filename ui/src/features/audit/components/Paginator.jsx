
export default function Paginator({ pagination, onPage, noun = 'logs' }) {
 if (pagination.total_pages <= 1) return null
 return <div className="flex! justify-between! items-center! p-[12px_18px]! [border-top:1px_solid_var(--color-slate-100)]!">
  <span className="text-[12px]! [color:var(--color-slate-500)]!">Page {pagination.page} of {pagination.total_pages} &nbsp;·&nbsp; {pagination.total_count} total {noun}</span>
  <div className="flex! gap-[8px]!">
   <button disabled={pagination.page <= 1} onClick={() => onPage(pagination.page - 1)} className="p-[6px_14px]! [background-color:var(--color-white)]! [border:1px_solid_var(--color-slate-300)]! rounded-[6px]! text-[12px]! font-semibold! cursor-pointer! [color:var(--color-slate-700)]! [transition:all_0.15s_ease]!">← Prev</button>
   <button disabled={pagination.page >= pagination.total_pages} onClick={() => onPage(pagination.page + 1)} className="p-[6px_14px]! [background-color:var(--color-white)]! [border:1px_solid_var(--color-slate-300)]! rounded-[6px]! text-[12px]! font-semibold! cursor-pointer! [color:var(--color-slate-700)]! [transition:all_0.15s_ease]!">Next →</button>
  </div>
 </div>
}
