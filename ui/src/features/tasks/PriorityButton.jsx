import { useState, useRef } from "react";
import { createPortal } from "react-dom";

// Exact Figma color codes for Priority variants
const PRIORITY_CONFIG = {
  high: {
    key: "high",
    label: "High",
    color: "#C90000",
    bgSubtle: "rgba(201, 0, 0, 0.08)",
  },
  medium: {
    key: "medium",
    label: "Medium",
    color: "#FF9500",
    bgSubtle: "rgba(255, 149, 0, 0.08)",
  },
  low: {
    key: "low",
    label: "Low",
    color: "#00900E",
    bgSubtle: "rgba(0, 144, 14, 0.08)",
  },
};

function normalizePriority(val) {
  if (!val) return "medium";
  const p = String(val).toLowerCase().trim();
  if (p === "urgent" || p === "critical") return "high";
  if (p === "normal") return "medium";
  return PRIORITY_CONFIG[p] ? p : "medium";
}

/**
 * PriorityIcon Component
 * Renders the rounded diamond with white exclamation mark '!'
 * Includes a hover tooltip showing all priority levels
 */
export function PriorityIcon({ priority = "medium", size = 22, className = "", showTooltip = false }) {
  const normKey = normalizePriority(priority);
  const cfg = PRIORITY_CONFIG[normKey] || PRIORITY_CONFIG.medium;
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const iconRef = useRef(null);

  const icon = (
    <svg
      ref={iconRef}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className + " " + "inline-block! shrink-0!"}

      onMouseEnter={() => {
        if (iconRef.current) {
          const rect = iconRef.current.getBoundingClientRect();
          setPosition({
            top: rect.top,
            left: rect.left + rect.width / 2
          });
        }
        setShow(true);
      }}
      onMouseLeave={() => setShow(false)}
    >
      {/* Rotated rounded square (diamond) */}
      <rect
        x="5"
        y="5"
        width="14"
        height="14"
        rx="2.6"
        transform="rotate(45 12 12)"
        fill={cfg.color}
      />
      {/* Exclamation point '!' in white */}
      <path
        d="M12 7.2v5.8"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.5" r="1.15" fill="#FFFFFF" />
    </svg>
  );

  if (!showTooltip) return icon;

  return (
    <>

      <span className="priority-icon-wrapper">
        {icon}
        {show && createPortal(
          <div
            className={"priority-tooltip" + " " + "fixed! [transform:translateX(-50%)]!"}
            style={{
  top: `${position.top - 35}px`,
  left: `${position.left}px`
}}
          >
            {cfg.label}
          </div>,
          document.body
        )}
      </span>
    </>
  );
}

/**
 * PriorityButton Component
 *
 * Implements the 3 Figma priority variants (High, Medium, Low).
 * By default, displays only the diamond symbol.
 * On hover / focus, smoothly expands to reveal the priority text label.
 *
 * @param {Object} props
 * @param {'high'|'medium'|'low'} [props.priority="medium"] - Priority level
 * @param {'sm'|'md'|'lg'} [props.size="md"] - Size of button/icon
 * @param {boolean} [props.showText=false] - If true, text is always shown (no collapse)
 * @param {boolean} [props.disabled=false] - Whether button is disabled
 * @param {function} [props.onClick] - Click handler
 * @param {string} [props.className=""] - Extra class name
 * @param {Object} [props.style={}] - Inline styles
 */
export default function PriorityButton({
  priority = "medium",
  size = "md",
  showText = false,
  disabled = false,
  onClick,
  className = "",
  style = {},
  type = "button",
  ...restProps
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const normKey = normalizePriority(priority);
  const cfg = PRIORITY_CONFIG[normKey] || PRIORITY_CONFIG.medium;

  const iconSizes = { sm: 18, md: 24, lg: 30 };
  const currentIconSize = iconSizes[size] || 24;

  const sizeClass = `priority-btn--${size}`;
  const displayClass = showText ? "priority-btn--always-show" : "";

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top,
        left: rect.left + rect.width / 2
      });
    }
  };

  return (
    <>

      <button
        ref={buttonRef}
        type={type}
        className={`priority-btn ${sizeClass} ${displayClass} ${className}`.trim()}
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsHovered(false)}
        aria-label={`Priority: ${cfg.label}`}
        data-priority={normKey}
        style={style}
        {...restProps}
      >
        <PriorityIcon priority={normKey} size={currentIconSize} />
        {showText && (
          <span className="priority-btn-text">
            {cfg.label}
          </span>
        )}
      </button>
      {!showText && isHovered && createPortal(
        <div
          className={"priority-tooltip" + " " + "fixed! [transform:translateX(-50%)]!"}
          style={{
  top: `${tooltipPosition.top - 35}px`,
  left: `${tooltipPosition.left}px`
}}
        >
          {cfg.label}
        </div>,
        document.body
      )}
    </>
  );
}

export { PriorityButton, PriorityButton as Priority };
