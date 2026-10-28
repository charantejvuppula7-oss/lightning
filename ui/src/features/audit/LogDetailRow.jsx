
export default function LogDetailRow({ label, value }) {
 return <div className="flex! flex-col! p-[12px_0]! [border-bottom:1px_solid_var(--color-slate-100)]! gap-[4px]!"><span className="text-[12px]! font-semibold! [color:var(--color-slate-500)]! [text-transform:uppercase]! tracking-[0.04em]!">{label}</span><span className="text-[14px]! [color:var(--color-slate-900)]! leading-[1.5]!">{String(value)}</span></div>
}
