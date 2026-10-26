
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
      <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            backgroundColor: data.badgeBg,
            color: data.badgeColor,
            border: `1px solid ${data.badgeBorder}`,
            borderRadius: "999px",
            padding: "2px 8px",
            fontSize: "10px",
            fontWeight: "600",
            lineHeight: "1.2",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: data.dotColor,
            }}
          />
          {data.badgeLabel}
        </span>
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: "12px",
          fontWeight: "700",
          color: "#0F172A",
          lineHeight: "1.3",
          marginBottom: "3px",
        }}
      >
        {data.title}
      </div>

      {/* Date / Subtitle */}
      <div
        style={{
          fontSize: "10px",
          color: "#64748B",
          fontWeight: "500",
          marginBottom: "8px",
        }}
      >
        {data.date}
      </div>

      {/* What Happened heading */}
      <div
        style={{
          fontSize: "11px",
          fontWeight: "700",
          color: "#1E293B",
          marginBottom: "3px",
        }}
      >
        What Happened
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: "10px",
          color: "#475569",
          lineHeight: "1.4",
        }}
      >
        {data.whatHappened}
      </div>

      {/* Downward Pointer Triangle */}
      <div
        style={{
          position: "absolute",
          top: "100%",
          left: pct <= 10 ? "15%" : pct >= 90 ? "85%" : "50%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: `6px solid ${data.borderColor}`,
        }}
      />
    </div>
  );
}
