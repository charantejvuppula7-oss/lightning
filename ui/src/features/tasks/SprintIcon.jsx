
import sprintIconImage from "./sprint-icon.png";

/**
 * SprintIcon Component
 *
 * Custom sprint icon using the provided image.
 *
 * @param {Object} props
 * @param {number} [props.size=22] - Width dimension in pixels
 * @param {string} [props.color] - Not used with image, kept for API compatibility
 * @param {number} [props.strokeWidth] - Not used with image, kept for API compatibility
 * @param {string} [props.className=""] - Extra CSS class
 * @param {Object} [props.style={}] - Inline styles
 */
export function SprintIcon({
  size = 22,
  className = "",
  style = {},
  ...restProps
}) {
  return (
    <img
      src={sprintIconImage}
      alt="Sprint"
      width={size}
      height={size}
      className={className}
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        flexShrink: 0,
        ...style,
      }}
      {...restProps}
    />
  );
}

/**
 * SprintBadge Component
 *
 * Renders the sprint symbol with:
 * - Sprint icon in blue (#1157CE)
 * - Sprint label (e.g. S12) in bold dark text (#0F172A)
 * - Story points (e.g. 4pt) in bold blue text (#2563EB)
 * Matches the user reference image exactly.
 *
 * @param {Object} props
 * @param {string|number} [props.sprint] - Sprint name/number
 * @param {number|string} [props.points] - Story points
 * @param {string} [props.iconColor="#1157CE"] - Primary icon color
 * @param {string} [props.sprintColor="#0F172A"] - Color of S<num> label (dark bold)
 * @param {string} [props.pointsColor="#2563EB"] - Color of pt label (vibrant blue bold)
 * @param {string} [props.className=""]
 * @param {Object} [props.style={}]
 */
export function SprintBadge({
  sprint,
  points,
  iconColor = "#1157CE",
  sprintColor = "#0F172A",
  pointsColor = "#2563EB",
  className = "",
  style = {},
  ...restProps
}) {
  // Ensure sprint format is always "S" + sprint number (e.g. S1, S2, S12)
  let displaySprint = sprint;
  if (typeof displaySprint === "number") {
    displaySprint = `S${displaySprint}`;
  } else if (typeof displaySprint === "string") {
    const trimmed = displaySprint.trim();
    const match = trimmed.match(/\d+/);
    if (!trimmed) {
      displaySprint = "";
    } else if (match) {
      displaySprint = `S${parseInt(match[0], 10)}`;
    } else if (!trimmed.startsWith("S")) {
      displaySprint = `S${trimmed}`;
    }
  }

  // Ensure points has 'pt'
  let displayPoints = points;
  if (displayPoints !== undefined && displayPoints !== null && displayPoints !== "") {
    displayPoints = String(displayPoints).endsWith("pt") ? displayPoints : `${displayPoints}pt`;
  }

  return (
    <div
      className={`sprint-badge ${className}`.trim()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        lineHeight: 1,
        ...style,
      }}
      {...restProps}
    >
      {displaySprint && <SprintIcon size={18} color={iconColor} />}
      {displaySprint && <span
        className="text-[14px]! font-bold! tracking-[-0.01em]!" style={{
  color: sprintColor
}}
      >
        {displaySprint}
      </span>}
      {displayPoints !== undefined && displayPoints !== null && displayPoints !== "" && (
        <span
          className="text-[14px]! font-bold! ml-[2px]!" style={{
  color: pointsColor
}}
        >
          {displayPoints}
        </span>
      )}
    </div>
  );
}

export default SprintIcon;
