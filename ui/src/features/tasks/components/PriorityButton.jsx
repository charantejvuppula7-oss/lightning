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

const PRIORITY_TOOLTIP_STYLES = `
  .priority-icon-wrapper {
    display: inline-flex;
    align-items: center;
  }
  .priority-tooltip {
    background: #FFFFFF;
    color: #1E293B;
    border: 1px solid #E2E8F0;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
    white-space: nowrap;
    pointer-events: none;
    z-index: 99999;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  .priority-tooltip::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-top-color: #E2E8F0;
  }
`;

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
      className={className}
      style={{ display: "inline-block", flexShrink: 0 }}
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
      <style>{PRIORITY_TOOLTIP_STYLES}</style>
      <span className="priority-icon-wrapper">
        {icon}
        {show && createPortal(
          <div
            className="priority-tooltip"
            style={{
              position: 'fixed',
              top: `${position.top - 35}px`,
              left: `${position.left}px`,
              transform: 'translateX(-50%)',
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

const STYLES = `
  .priority-btn {
    display: inline-flex;
    align-items: center;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    user-select: none;
    outline: none;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-weight: 500;
    line-height: 1.25;
    white-space: nowrap;
    overflow: hidden;
    box-sizing: border-box;
    transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.18s ease, transform 0.12s ease;
    position: relative;
  }

  .priority-btn:active:not(:disabled) {
    transform: scale(0.97);
  }

  .priority-btn:focus-visible {
    box-shadow: 0 0 0 2px rgba(100, 116, 139, 0.25);
  }

  .priority-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    pointer-events: none;
  }

  /* Sizes */
  .priority-btn--sm {
    padding: 3px;
    min-height: 28px;
    min-width: 28px;
    font-size: 13px;
  }
  .priority-btn--md {
    padding: 5px;
    min-height: 36px;
    min-width: 36px;
    font-size: 16px;
  }
  .priority-btn--lg {
    padding: 7px;
    min-height: 44px;
    min-width: 44px;
    font-size: 18px;
  }

  /* Tooltip for PriorityButton */
  .priority-btn .priority-tooltip {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: #FFFFFF;
    color: #1E293B;
    border: 1px solid #E2E8F0;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
    white-space: nowrap;
    margin-bottom: 6px;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.15s ease, visibility 0.15s ease;
    pointer-events: none;
    z-index: 9999;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  .priority-btn .priority-tooltip::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-top-color: #E2E8F0;
  }
  .priority-btn:hover .priority-tooltip {
    opacity: 1;
    visibility: visible;
  }

  /* Sliding label container for when showText is true */
  .priority-btn-text {
    max-width: 0;
    opacity: 0;
    margin-left: 0;
    overflow: hidden;
    color: #475569;
    letter-spacing: -0.01em;
    transition: max-width 0.22s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.18s ease, margin-left 0.18s ease;
  }

  /* Always show text when showText is true */
  .priority-btn--always-show {
    background-color: rgba(0, 0, 0, 0.04);
  }

  .priority-btn--sm.priority-btn--always-show {
    padding: 3px 8px 3px 5px;
  }
  .priority-btn--md.priority-btn--always-show {
    padding: 5px 12px 5px 7px;
  }
  .priority-btn--lg.priority-btn--always-show {
    padding: 7px 16px 7px 9px;
  }

  .priority-btn--always-show .priority-btn-text {
    max-width: 120px;
    opacity: 1;
    margin-left: 8px;
  }
`;

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
      <style>{STYLES}</style>
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
          className="priority-tooltip"
          style={{
            position: 'fixed',
            top: `${tooltipPosition.top - 35}px`,
            left: `${tooltipPosition.left}px`,
            transform: 'translateX(-50%)',
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
