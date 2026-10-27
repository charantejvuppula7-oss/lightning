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
      className="fixed! w-[240px]! [background-color:#FFFFFF]! [border:1px_solid_#E2E8F0]! rounded-[10px]! [box-shadow:0_8px_24px_-4px_rgba(15,_23,_42,_0.14),_0_3px_8px_-2px_rgba(15,_23,_42,_0.06)]! p-[12px_14px]! box-border! z-[1300]! [font-family:'Inter',_-apple-system,_BlinkMacSystemFont,_'Segoe_UI',_Roboto,_sans-serif]! [animation:fadeInDepPopover_0.12s_ease-out_forwards]!" style={{
  top: `${position.top}px`,
  left: `${position.left}px`
}}
      onClick={(e) => e.stopPropagation()}
    >

      {/* Top Row: Icon + "Dependency Details" + Count Pill */}
      <div
        className="flex! items-center! justify-between! mb-[10px]!"
      >
        <div className="flex! items-center! gap-[8px]!">
          <DependencyIcon size={17} color="#111827" strokeWidth={2.2} />
          <span
            className="text-[13.5px]! font-semibold! [color:#111827]! tracking-[-0.01em]! leading-[1.2]!"
          >
            Dependency Details
          </span>
        </div>

        {/* Count Pill */}
        <div
          className="[background-color:#EEF2FF]! [color:#1E293B]! text-[12px]! font-semibold! p-[2px_10px]! rounded-[9999px]! leading-[1.2]!"
        >
          {count}
        </div>
      </div>

      {/* Bottom Row: "View Details →" + "+" */}
      <div className="flex! items-center! gap-[8px]!">
        <button
          type="button"
          className={"dep-popover-view-btn" + " " + "flex-1! h-[32px]! [background-color:#1157CE]! [color:#FFFFFF]! border-0! rounded-[6px]! text-[12.5px]! font-semibold! cursor-pointer! inline-flex! items-center! justify-center! gap-[6px]! [transition:background-color_0.15s_ease]! outline-none! p-[0_10px]!"}
          onClick={() => {
            onClose?.();
            onViewDetails?.();
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
          className={"dep-popover-add-btn" + " " + "w-[32px]! h-[32px]! shrink-0! [background-color:#FFFFFF]! [border:1px_solid_#E2E8F0]! rounded-[6px]! [color:#111827]! cursor-pointer! inline-flex! items-center! justify-center! [transition:background-color_0.15s_ease,_border-color_0.15s_ease]! outline-none!"}
          title="Add Dependency"
          aria-label="Add Dependency"
          onClick={() => {
            onClose?.();
            onAddDependency?.();
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
            className="text-[14px]! font-semibold! [color:#5E636D]! leading-[1]!"
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
