import { useState, useEffect, useRef } from "react";

// Exact color codes from design specification
const TIMER_COLORS = {
  // Default / Idle state ("default time")
  default: {
    bg: "#CECFD2",
    circleBg: "#454545",
    circleBorder: "transparent",
    iconColor: "#FFFFFF",
    divider: "rgba(69, 69, 69, 0.28)",
    textColor: "#454545",
  },
  // Running state ("timer start/resume")
  running: {
    bg: "#00B0D8",
    circleBg: "#004555",
    circleBorder: "transparent",
    iconColor: "#00B0D8",
    divider: "rgba(0, 69, 85, 0.28)",
    textColor: "#004555",
  },
  // In-progress alias
  in_progress: {
    bg: "#00B0D8",
    circleBg: "#004555",
    circleBorder: "transparent",
    iconColor: "#00B0D8",
    divider: "rgba(0, 69, 85, 0.28)",
    textColor: "#004555",
  },
  // Paused state (maintains the In-progress timer color)
  paused: {
    bg: "#00B0D8",
    circleBg: "#004555",
    circleBorder: "transparent",
    iconColor: "#00B0D8",
    divider: "rgba(0, 69, 85, 0.28)",
    textColor: "#004555",
  },
  // Completed state ("Timer completed")
  completed: {
    bg: "#22A06B",
    circleBg: "#146C43",
    circleBorder: "transparent",
    iconColor: "#ABDBB0",
    divider: "rgba(171, 219, 176, 0.55)",
    textColor: "#ABDBB0",
  },
};

// Helper: Format seconds to HH:MM:SS
function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const hrs = String(Math.floor(s / 3600)).padStart(2, "0");
  const mins = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const secs = String(s % 60).padStart(2, "0");
  return `${hrs}:${mins}:${secs}`;
}

/**
 * TaskTimerButton Component
 *
 * Implements the Figma "Task Timer" button set with 4 visual states:
 * 1. Default (00:00:00) -> Pill: #CECFD2 | Circle: #454545 | Text: #454545
 * 2. Running / Active (02:45:00) -> Pill: #00B0D8 | Circle: #004555 | Text: #004555
 * 3. Paused (02:45:00) -> Pill: #CECFD2 | Circle: #454545 | Text: #454545
 * 4. Completed (24:01:23) -> Pill: #22A06B | Circle: #146C43 | Mint icon and text
 *
 * @param {Object} props
 * @param {'default'|'running'|'paused'|'completed'} [props.status] - Explicit status/variant
 * @param {'default'|'running'|'paused'|'completed'} [props.variant] - Alias for status
 * @param {string} [props.time] - Custom formatted time string (e.g. "02:45:00")
 * @param {number} [props.seconds=0] - Timer elapsed seconds
 * @param {boolean} [props.autoTick=false] - Automatically tick seconds when running
 * @param {'sm'|'md'|'lg'} [props.size="md"] - Size of the button
 * @param {boolean} [props.disabled=false] - Whether button is disabled
 * @param {function} [props.onToggle] - Callback (nextStatus, currentSeconds)
 * @param {function} [props.onClick] - Click handler
 */
export default function TaskTimerButton({
  status,
  variant,
  time,
  seconds = 0,
  autoTick = false,
  size = "md",
  disabled = false,
  onToggle,
  onClick,
  className = "",
  style = {},
  type = "button",
  ...restProps
}) {
  const initialStatus = status || variant || "default";
  const [internalStatus, setInternalStatus] = useState(initialStatus);
  const [elapsedSeconds, setElapsedSeconds] = useState(seconds);
  const timerRef = useRef(null);

  const activeStatus = status || variant || internalStatus;

  // The parent keys the timer by its persisted values.
  // Auto-tick effect when running
  useEffect(() => {
    if (autoTick && activeStatus === "running") {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoTick, activeStatus]);

  // Palette resolution
  const theme = TIMER_COLORS[activeStatus] || TIMER_COLORS.default;

  const handleClick = (e) => {
    if (disabled) return;

    let nextStatus = activeStatus;
    if (activeStatus === "default") {
      nextStatus = "running";
    } else if (activeStatus === "running") {
      nextStatus = "paused";
    } else if (activeStatus === "paused") {
      nextStatus = "running";
    }

    if (!status && !variant) {
      setInternalStatus(nextStatus);
    }

    if (onToggle) {
      onToggle(nextStatus, elapsedSeconds);
    }
    if (onClick) {
      onClick(e);
    }
  };

  const displayTime = time || (elapsedSeconds > 0 ? formatTime(elapsedSeconds) : "00:00:00");
  const isPauseIcon = activeStatus === "running";

  return (
    <>

      <button
        type={type}
        className={`task-timer-btn task-timer-btn--${size} ${className}`.trim()}
        onClick={handleClick}
        disabled={disabled}
        data-status={activeStatus}
        style={{
          backgroundColor: theme.bg,
          ...style,
        }}
        {...restProps}
      >
        {/* Circular Action Icon (Play / Pause) */}
        <span
          className="task-timer-circle"
          style={{ backgroundColor: theme.circleBg, border: `2px solid ${theme.circleBorder}` }}
        >
          {isPauseIcon ? (
            /* Pause Icon */
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill={theme.iconColor}
              className="block!"
            >
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            /* Play Icon */
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill={theme.iconColor}
              className="block! [transform:translateX(1px)]!"
            >
              <path d="M8 5.5v13a1 1 0 0 0 1.54.84l10.2-6.5a1 1 0 0 0 0-1.68l-10.2-6.5A1 1 0 0 0 8 5.5z" />
            </svg>
          )}
        </span>

        {/* Vertical Divider Line */}
        <span
          className="task-timer-divider"
          style={{ backgroundColor: theme.divider }}
        />

        {/* Time Text Display */}
        <span
          className="task-timer-display"
          style={{ color: theme.textColor }}
        >
          {displayTime}
        </span>
      </button>
    </>
  );
}

export { TaskTimerButton, TaskTimerButton as TaskTimer };
