import { useState } from "react";

// Exact Figma color codes

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
