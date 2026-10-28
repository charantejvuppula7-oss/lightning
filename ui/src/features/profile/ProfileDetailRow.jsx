export default function ProfileDetailRow({ label, value, required = false, children, isLast = false, rowClassName = '', labelClassName = '', valueClassName = '' }) {
  return <div className={`flex items-center py-[16px] ${isLast ? 'border-b-0' : 'border-b border-(--color-slate-50)'} ${rowClassName}`}>
    <div className={`w-[220px] shrink-0 text-[13.5px] font-semibold text-(--color-slate-900) ${labelClassName}`}>
      {label}{required && <span className="text-(--color-danger) ml-[3px]">*</span>}
    </div>
    <div className={`flex-1 text-[13.5px] text-(--color-slate-700) ${valueClassName}`}>
      {children !== undefined ? children : (value || '—')}
    </div>
  </div>
}
