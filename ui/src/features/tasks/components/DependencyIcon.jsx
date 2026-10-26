import { useEffect, useRef, useState, forwardRef } from "react";
import { createPortal } from "react-dom";

/**
 * DependencyIcon Component
 *
 * Crisp vector dependency icon matching Figma.
 */
export function DependencyIcon({
  size = 18,
  color,
  strokeWidth,
  className = "",
  style = {},
  ...restProps
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}
      aria-hidden="true"
      {...restProps}
    >
      <path d="M7 12h4m0-7v14m0-14h5m-5 7h5m-5 7h5" stroke={color || "#1E293B"} strokeWidth={strokeWidth || 2.2} strokeLinecap="round" strokeLinejoin="round" />
      <rect x="2.5" y="9.5" width="4.5" height="5" rx="0.35" stroke={color || "#1E293B"} strokeWidth={strokeWidth || 2.2} />
      <rect x="16" y="2.5" width="5" height="5" rx="0.35" stroke={color || "#1E293B"} strokeWidth={strokeWidth || 2.2} />
      <rect x="16" y="9.5" width="5" height="5" rx="0.35" stroke={color || "#1E293B"} strokeWidth={strokeWidth || 2.2} />
      <rect x="16" y="16.5" width="5" height="5" rx="0.35" stroke={color || "#1E293B"} strokeWidth={strokeWidth || 2.2} />
    </svg>
  );
}

/**
 * Compact DependencyDetailsPopover Component
 *
 * Properly proportioned popover card:
 * - Top row: Dependency tree icon + "Dependency Details" + count pill
 * - Bottom row: "View Details →" button + "+" add dependency button
 */
export function DependencyDetailsPopover({
  isOpen,
  onClose,
  count = 1,
  triggerRef,
  onViewDetails,
  onAddDependency,
}) {
  const popoverRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const updatePosition = () => {
    if (!triggerRef?.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 240;
    const popoverHeight = 94;
    const gap = 6;

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 10) {
      left = window.innerWidth - popoverWidth - 10;
    }
    if (left < 10) left = 10;

    let top = rect.bottom + gap;
    if (top + popoverHeight > window.innerHeight - 10) {
      top = Math.max(10, rect.top - popoverHeight - gap);
    }

    setPosition({ top, left });
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleOutsideClick = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        triggerRef?.current &&
        !triggerRef.current.contains(e.target)
      ) {
        onClose?.();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Dependency Details"
      style={{
        position: "fixed",
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: "240px",
        backgroundColor: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "10px",
        boxShadow:
          "0 8px 24px -4px rgba(15, 23, 42, 0.14), 0 3px 8px -2px rgba(15, 23, 42, 0.06)",
        padding: "12px 14px",
        boxSizing: "border-box",
        zIndex: 1300,
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        animation: "fadeInDepPopover 0.12s ease-out forwards",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <style>{`
        @keyframes fadeInDepPopover {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .dep-popover-view-btn:hover {
          background-color: #3876E5 !important;
        }
        .dep-popover-add-btn:hover {
          background-color: #F1F5F9 !important;
          border-color: #CBD5E1 !important;
        }
      `}</style>

      {/* Top Row: Icon + "Dependency Details" + Count Pill */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <DependencyIcon size={17} color="#111827" strokeWidth={2.2} />
          <span
            style={{
              fontSize: "13.5px",
              fontWeight: "600",
              color: "#111827",
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
            }}
          >
            Dependency Details
          </span>
        </div>

        {/* Count Pill */}
        <div
          style={{
            backgroundColor: "#EEF2FF",
            color: "#1E293B",
            fontSize: "12px",
            fontWeight: "600",
            padding: "2px 10px",
            borderRadius: "9999px",
            lineHeight: 1.2,
          }}
        >
          {count}
        </div>
      </div>

      {/* Bottom Row: "View Details →" + "+" */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          type="button"
          className="dep-popover-view-btn"
          onClick={() => {
            onClose?.();
            onViewDetails?.();
          }}
          style={{
            flex: 1,
            height: "32px",
            backgroundColor: "#1157CE",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "6px",
            fontSize: "12.5px",
            fontWeight: "600",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            transition: "background-color 0.15s ease",
            outline: "none",
            padding: "0 10px",
          }}
        >
          <span>View Details</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>

        <button
          type="button"
          className="dep-popover-add-btn"
          title="Add Dependency"
          aria-label="Add Dependency"
          onClick={() => {
            onClose?.();
            onAddDependency?.();
          }}
          style={{
            width: "32px",
            height: "32px",
            flexShrink: 0,
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "6px",
            color: "#111827",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background-color 0.15s ease, border-color 0.15s ease",
            outline: "none",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    </div>,
    document.body
  );
}

/**
 * DependencyBadge Component
 *
 * Includes built-in compact popover functionality when clicked.
 */
export const DependencyBadge = forwardRef(function DependencyBadge({
  count,
  showCount = false,
  onClick,
  onViewDetails,
  onAddDependency,
  showPopover = true,
  title,
  className = "",
  style = {},
  iconSize = 16,
  ...restProps
}, ref) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const internalRef = useRef(null);
  const buttonRef = ref || internalRef;

  const numericCount = Number(count);
  const showDependencyCount = showCount && Number.isFinite(numericCount) && numericCount > 1;
  const displayTitle =
    title ||
    (count !== undefined && count !== null
      ? `${count} dependenc${Number(count) === 1 ? "y" : "ies"}`
      : "Dependencies");

  const handleClick = (e) => {
    e.stopPropagation();
    if (showPopover && (onViewDetails || onAddDependency)) {
      setIsPopoverOpen((prev) => !prev);
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        title={displayTitle}
        aria-label={displayTitle}
        className={`dependency-pill-btn ${className}`.trim()}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          backgroundColor: "#F3F4F6",
          border: "none",
          borderRadius: "9px",
          padding: "4px 7px",
          minHeight: "30px",
          cursor: "pointer",
          color: "#1E293B",
          outline: "none",
          userSelect: "none",
          ...style,
        }}
        {...restProps}
      >
        <DependencyIcon size={iconSize} color="#1E293B" strokeWidth={2.2} />
        {showDependencyCount && (
          <span
            style={{
              fontSize: "14px",
              fontWeight: "600",
              color: "#5E636D",
              lineHeight: 1,
            }}
          >
            +{numericCount}
          </span>
        )}
      </button>

      {showPopover && (onViewDetails || onAddDependency) && (
        <DependencyDetailsPopover
          isOpen={isPopoverOpen}
          onClose={() => setIsPopoverOpen(false)}
          count={count}
          triggerRef={buttonRef}
          onViewDetails={onViewDetails}
          onAddDependency={onAddDependency}
        />
      )}
    </>
  );
});

export const DependencyButton = DependencyBadge;

export default DependencyBadge;
