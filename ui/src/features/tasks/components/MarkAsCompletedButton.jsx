import { useState } from "react";

// Exact Figma color codes
const COLORS = {
  default: "#028229",   // State 1: Dark green
  hover: "#679D74",     // State 2: Sage / muted green
  completed: "#ABDBB0", // State 3: Soft pastel mint
  textLight: "#FFFFFF", // Text for State 1 & 2
  textDark: "#5A5E66",  // Text for State 3 ("Done")
};

const BUTTON_STYLES = `
  .mark-as-completed-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-weight: 600;
    border-radius: 8px;
    border: none;
    outline: none;
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
    text-decoration: none;
    transition: background-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease, transform 0.12s ease;
    line-height: 1.25;
    box-sizing: border-box;
  }

  .mark-as-completed-btn--sm {
    padding: 8px 16px;
    font-size: 13px;
  }

  .mark-as-completed-btn--md {
    padding: 12px 24px;
    font-size: 15px;
    min-height: 48px;
  }

  .mark-as-completed-btn--lg {
    padding: 14px 28px;
    font-size: 16px;
    min-height: 54px;
  }

  .mark-as-completed-btn--full {
    width: 100%;
  }

  /* Variant 1: Default / Active state (#028229) */
  .mark-as-completed-btn--default {
    background-color: ${COLORS.default};
    color: ${COLORS.textLight};
  }
  .mark-as-completed-btn--default:hover:not(:disabled) {
    background-color: ${COLORS.hover};
    color: ${COLORS.textLight};
  }

  /* Variant 2: Hover / In-between state (#679D74) */
  .mark-as-completed-btn--hover {
    background-color: ${COLORS.hover};
    color: ${COLORS.textLight};
  }
  .mark-as-completed-btn--hover:hover:not(:disabled) {
    background-color: #588e65;
    color: ${COLORS.textLight};
  }

  /* Variant 3: Completed / Done state (#ABDBB0) */
  .mark-as-completed-btn--completed,
  .mark-as-completed-btn--done {
    background-color: ${COLORS.completed};
    color: ${COLORS.textDark};
  }
  .mark-as-completed-btn--completed:hover:not(:disabled),
  .mark-as-completed-btn--done:hover:not(:disabled) {
    background-color: #9dcca2;
    color: #42464e;
  }

  .mark-as-completed-btn:focus-visible {
    box-shadow: 0 0 0 3px rgba(2, 130, 41, 0.28);
  }

  .mark-as-completed-btn:active:not(:disabled) {
    transform: scale(0.985);
  }

  .mark-as-completed-btn:disabled,
  .mark-as-completed-btn--disabled {
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
    transform: none !important;
  }
`;

/**
 * MarkAsCompletedButton Component
 *
 * Single self-contained component representing the 3 Figma button states:
 * - Default: #028229 with "Mark as completed"
 * - Hover / Secondary: #679D74 with "Mark as completed"
 * - Completed / Done: #ABDBB0 with "Done" (#5A5E66)
 *
 * @param {Object} props
 * @param {boolean} [props.completed] - Controlled completed boolean
 * @param {boolean} [props.isCompleted] - Alias for completed
 * @param {boolean} [props.defaultCompleted=false] - Initial state for uncontrolled mode
 * @param {'default'|'hover'|'completed'|'done'} [props.variant] - Explicit state variant override
 * @param {string} [props.label="Mark as completed"] - Uncompleted text
 * @param {string} [props.completedLabel="Done"] - Completed text
 * @param {'sm'|'md'|'lg'} [props.size="md"] - Button size
 * @param {boolean} [props.fullWidth=false] - Full width button
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {function} [props.onToggle] - Callback (nextCompletedState, event)
 * @param {function} [props.onClick] - Click handler
 * @param {string} [props.className=""] - Extra CSS class
 * @param {Object} [props.style={}] - Inline style overrides
 * @param {React.ReactNode} [props.children] - Custom label override
 */
export default function MarkAsCompletedButton({
  completed,
  isCompleted,
  defaultCompleted = false,
  variant,
  label = "Mark as completed",
  completedLabel = "Done",
  size = "md",
  fullWidth = false,
  disabled = false,
  onToggle,
  onClick,
  className = "",
  style = {},
  type = "button",
  children,
  ...restProps
}) {
  const isControlled = typeof completed === "boolean" || typeof isCompleted === "boolean";
  const effectiveCompletedProp = completed ?? isCompleted ?? defaultCompleted;
  const [internalCompleted, setInternalCompleted] = useState(effectiveCompletedProp);

  const activeCompleted = isControlled ? effectiveCompletedProp : internalCompleted;

  // Variant resolution: explicit prop has priority, else derived from activeCompleted
  const effectiveVariant = variant || (activeCompleted ? "completed" : "default");

  const handleClick = (e) => {
    if (disabled) return;

    const nextState = !activeCompleted;
    if (!isControlled) {
      setInternalCompleted(nextState);
    }

    if (onToggle) {
      onToggle(nextState, e);
    }
    if (onClick) {
      onClick(e);
    }
  };

  const displayText =
    children ??
    (effectiveVariant === "completed" || effectiveVariant === "done"
      ? completedLabel
      : label);

  const variantClass = `mark-as-completed-btn--${effectiveVariant}`;
  const sizeClass = `mark-as-completed-btn--${size}`;
  const widthClass = fullWidth ? "mark-as-completed-btn--full" : "";
  const disabledClass = disabled ? "mark-as-completed-btn--disabled" : "";

  return (
    <>
      <style>{BUTTON_STYLES}</style>
      <button
        type={type}
        className={`mark-as-completed-btn ${variantClass} ${sizeClass} ${widthClass} ${disabledClass} ${className}`.trim()}
        onClick={handleClick}
        disabled={disabled}
        aria-pressed={activeCompleted}
        data-variant={effectiveVariant}
        style={style}
        {...restProps}
      >
        {displayText}
      </button>
    </>
  );
}

export { MarkAsCompletedButton };
