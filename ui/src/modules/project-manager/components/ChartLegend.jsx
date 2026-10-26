export default function ChartLegend({ items }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <span style={{ width: "12px", height: "2px", borderRadius: "1px", backgroundColor: item.color, display: "inline-block" }} />
          <span style={{ fontSize: "11px", color: "var(--color-slate-500)" }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
