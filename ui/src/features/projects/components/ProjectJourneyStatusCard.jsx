
// ---------------------------------------------------------------------------
// Static Status Card Definitions (Matching reference image, 100% frontend only)
// ---------------------------------------------------------------------------
/**
 * ProjectJourneyStatusCard Component
 * Displays a detailed status card popup positioned over timeline markers/segments.
 *
 * @param {object} props
 * @param {object} [props.cardData] - The data object for the card (from STATUS_CARDS or custom)
 * @param {string} [props.status] - Key into STATUS_CARDS ('blue', 'green', 'gray', 'red', 'orange', 'purple')
 * @param {number} [props.positionPct=50] - Horizontal percentage (0-100) along the timeline
 * @param {object} [props.style] - Additional style overrides
 */
export default function ProjectJourneyStatusCard({
  cardData,
  positionPct = 50,
  style = {},
}) {
  const data = cardData;
  if (!data) return null;

  const pct = Number(positionPct);

  return (
    <div
      style={{
        position: "absolute",
        left: `${pct}%`,
        bottom: "calc(100% + 14px)",
        transform: pct <= 10 ? "translateX(-5%)" : pct >= 90 ? "translateX(-95%)" : "translateX(-50%)",
        width: "250px",
        backgroundColor: "#ffffff",
        border: `1.5px solid ${data.borderColor}`,
        borderRadius: "8px",
        padding: "12px 14px",
        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.12), 0 4px 8px -2px rgba(0,0,0,0.06)",
        zIndex: 1000,
        pointerEvents: "none",
        fontFamily: "'Inter', system-ui, sans-serif",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {/* Status Pill Badge */}
      <div className="flex! items-center! mb-[8px]!">
        <span
          className="inline-flex! items-center! gap-[5px]! rounded-[999px]! p-[2px_8px]! text-[10px]! font-semibold! leading-[1.2]!" style={{
  backgroundColor: data.badgeBg,
  color: data.badgeColor,
  border: `1px solid ${data.badgeBorder}`
}}
        >
          <span
            className="w-[6px]! h-[6px]! rounded-[50%]!" style={{
  backgroundColor: data.dotColor
}}
          />
          {data.badgeLabel}
        </span>
      </div>

      {/* Title */}
      <div
        className="text-[12px]! font-bold! [color:#0F172A]! leading-[1.3]! mb-[3px]!"
      >
        {data.title}
      </div>

      {/* Date / Subtitle */}
      <div
        className="text-[10px]! [color:#64748B]! font-medium! mb-[8px]!"
      >
        {data.date}
      </div>

      {/* What Happened heading */}
      <div
        className="text-[11px]! font-bold! [color:#1E293B]! mb-[3px]!"
      >
        What Happened
      </div>

      {/* Description */}
      <div
        className="text-[10px]! [color:#475569]! leading-[1.4]!"
      >
        {data.whatHappened}
      </div>

      {/* Downward Pointer Triangle */}
      <div
        className="absolute! top-[100%]! [transform:translateX(-50%)]! w-[0]! h-[0]! [border-left:6px_solid_transparent]! [border-right:6px_solid_transparent]!" style={{
  left: pct <= 10 ? "15%" : pct >= 90 ? "85%" : "50%",
  borderTop: `6px solid ${data.borderColor}`
}}
      />
    </div>
  );
}
