

// Exact Figma color codes and metadata for each status
const STATUS_CONFIG = {
  assigned: {
    key: "assigned",
    label: "Assigned",
    border: "#375587",
    fill: "transparent",
    textColor: "#1E293B",
  },
  in_progress: {
    key: "in_progress",
    label: "In-Progress",
    border: "#375587",
    fill: "#659AF4",
    textColor: "#1E293B",
  },
  change_requested: {
    key: "change_requested",
    label: "Change Requested",
    border: "#A16207",
    fill: "#EAB308",
    textColor: "#1E293B",
  },
  in_review: {
    key: "in_review",
    label: "In-Review",
    border: "#A66143",
    fill: "#E49885",
    textColor: "#1E293B",
  },
  completed: {
    key: "completed",
    label: "Completed",
    border: "#146C43",
    fill: "#22A06B",
    textColor: "#1E293B",
  },
  reopen: {
    key: "reopen",
    label: "Reopen",
    border: "#A1A1A1",
    fill: "#A1A1A1",
    subtle: "#CECFD2",
    textColor: "#1E293B",
  },
  paused: {
    key: "paused",
    label: "In-Progress",
    border: "#375587",
    fill: "#659AF4",
    textColor: "#1E293B",
  },
};

// Normalize input status key
function normalizeStatus(val) {
  if (!val) return "assigned";
  const s = String(val).toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (s === "default") return "assigned";
  if (s === "paused") return "in_progress";
  if (s === "done") return "completed";
  if (s === "reopened") return "reopen";
  if (s === "change_request") return "change_requested";
  if (s === "in_review" || s === "review") return "in_review";
  if (s === "in_progress" || s === "progress") return "in_progress";
  return STATUS_CONFIG[s] ? s : "assigned";
}

/**
 * StatusIcon Component
 * Renders the exact circular progress / lifecycle vector for each status
 */
export function StatusIcon({ status = "assigned", size = 26, className = "" }) {
  const normKey = normalizeStatus(status);
  const cfg = STATUS_CONFIG[normKey] || STATUS_CONFIG.assigned;

  const r = 9.5;
  const strokeWidth = 2.4;

  switch (normKey) {
    case "assigned":
      // 0% filled: Dashed outer circle (#375587), transparent center
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={className + " " + "inline-block! shrink-0!"}

        >
          <circle
            cx="12"
            cy="12"
            r={r}
            stroke={cfg.border}
            strokeWidth={strokeWidth}
            strokeDasharray="4.2 3.2"
            strokeLinecap="round"
          />
        </svg>
      );

    case "in_progress":
      // 50% filled: Top half dashed arc, bottom half filled semicircle (#659AF4) with solid border (#375587)
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={className + " " + "inline-block! shrink-0!"}

        >
          {/* Top half dashed arc */}
          <path
            d="M 2.5 12 A 9.5 9.5 0 0 1 21.5 12"
            stroke={cfg.border}
            strokeWidth={strokeWidth}
            strokeDasharray="4.2 3.2"
            strokeLinecap="round"
          />
          {/* Bottom half filled semicircle with solid border */}
          <path
            d="M 2.5 12 A 9.5 9.5 0 0 0 21.5 12 Z"
            fill={cfg.fill}
            stroke={cfg.border}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </svg>
      );

    case "change_requested":
      // 75% filled: 3 quadrants filled (#EAB308) with border (#A16207), top-right quadrant open with dashed arc
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={className + " " + "inline-block! shrink-0!"}

        >
          {/* 3/4 filled pie: Top-Left, Bottom-Left, Bottom-Right */}
          <path
            d="M 12 12 L 12 2.5 A 9.5 9.5 0 1 0 21.5 12 L 12 12 Z"
            fill={cfg.fill}
            stroke={cfg.border}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          {/* Top-Right open quadrant dashed arc */}
          <path
            d="M 12 2.5 A 9.5 9.5 0 0 1 21.5 12"
            stroke={cfg.border}
            strokeWidth={strokeWidth}
            strokeDasharray="3.5 2.5"
            strokeLinecap="round"
          />
        </svg>
      );

    case "in_review":
      // 75% filled: 3 quadrants filled (#E49885) with border (#A66143), top-right quadrant open with dashed arc
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={className + " " + "inline-block! shrink-0!"}

        >
          {/* 3/4 filled pie */}
          <path
            d="M 12 12 L 12 2.5 A 9.5 9.5 0 1 0 21.5 12 L 12 12 Z"
            fill={cfg.fill}
            stroke={cfg.border}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          {/* Top-Right open quadrant dashed arc */}
          <path
            d="M 12 2.5 A 9.5 9.5 0 0 1 21.5 12"
            stroke={cfg.border}
            strokeWidth={strokeWidth}
            strokeDasharray="3.5 2.5"
            strokeLinecap="round"
          />
        </svg>
      );

    case "completed":
      // 100% filled: Solid circle (#22A06B) with dark green border (#146C43)
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={className + " " + "inline-block! shrink-0!"}

        >
          <circle
            cx="12"
            cy="12"
            r={r}
            fill={cfg.fill}
            stroke={cfg.border}
            strokeWidth={strokeWidth}
          />
        </svg>
      );

    case "reopen":
      // Solid neutral gray circle (#A1A1A1)
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={className + " " + "inline-block! shrink-0!"}

        >
          <circle
            cx="12"
            cy="12"
            r={r}
            fill={cfg.fill}
            stroke={cfg.border}
            strokeWidth={0.5}
          />
        </svg>
      );

    default:
      return null;
  }
}

/**
 * StatusButton Component
 *
 * Implements the Figma "Status" component with all 6 variants:
 * 1. Assigned -> Dashed blue circle (#375587)
 * 2. In-Progress -> 50% bottom filled (#659AF4 / #375587)
 * 3. Change Requested -> 75% filled pie (#EAB308 / #A16207)
 * 4. In-Review -> 75% filled pie (#E49885 / #A66143)
 * 5. Completed -> Solid emerald (#22A06B / #146C43)
 * 6. Reopen -> Solid gray circle (#A1A1A1 / #CECFD2)
 *
 * @param {Object} props
 * @param {'assigned'|'in_progress'|'change_requested'|'in_review'|'completed'|'reopen'} [props.status="assigned"] - Status variant
 * @param {string} [props.label] - Optional custom label
 * @param {'sm'|'md'|'lg'} [props.size="md"] - Size
 * @param {'item'|'badge'|'static'} [props.variant="item"] - Display variant
 * @param {boolean} [props.showIcon=true] - Whether to show the circular status icon
 * @param {boolean} [props.showLabel=true] - Whether to show the text label
 * @param {boolean} [props.disabled=false] - Whether button is disabled
 * @param {function} [props.onClick] - Click handler
 */
export default function StatusButton({
  status = "assigned",
  label,
  size = "md",
  variant = "item",
  showIcon = true,
  showLabel = true,
  disabled = false,
  onClick,
  className = "",
  style = {},
  type = "button",
  children,
  ...restProps
}) {
  const normKey = normalizeStatus(status);
  const cfg = STATUS_CONFIG[normKey] || STATUS_CONFIG.assigned;

  const displayLabel = children ?? (label || cfg.label);

  const iconSizes = {
    sm: 20,
    md: 26,
    lg: 32,
  };
  const currentIconSize = iconSizes[size] || 26;

  const isStatic = variant === "static" || !onClick;
  const staticClass = isStatic ? "status-btn--static" : "";
  const variantClass = variant === "badge" ? "status-btn--badge" : "";
  const sizeClass = `status-btn--${size}`;

  return (
    <>

      <button
        type={type}
        className={`status-btn ${sizeClass} ${variantClass} ${staticClass} ${className}`.trim()}
        onClick={onClick}
        disabled={disabled}
        data-status={normKey}
        style={style}
        {...restProps}
      >
        {showIcon && (
          <StatusIcon status={normKey} size={currentIconSize} />
        )}
        {showLabel && (
          <span className="status-btn-label">
            {displayLabel}
          </span>
        )}
      </button>
    </>
  );
}

export { StatusButton, StatusButton as Status };
