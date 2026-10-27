export default function ChartLegend({ items }) {
  return (
    <div className="flex! items-center! gap-[14px]! flex-wrap!">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex! items-center! gap-[5px]!">
          <span className="w-[12px]! h-[2px]! rounded-[1px]! inline-block!" style={{
  backgroundColor: item.color
}} />
          <span className="text-[11px]! [color:var(--color-slate-500)]!">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
