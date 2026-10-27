import { useEffect, useRef } from "react";

/**
 * SortMenu Component
 *
 * Displays sort options matching the design:
 * - Each item shows Category/Label on the left ("Task", "Due Date", etc.)
 * - Subtext/Direction on the right ("Newest", "Oldest", etc.)
 * - Blue checkmark (✓) when selected
 * - Gray background hover highlight
 *
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - value: string (current active sort key)
 *  - onChange: (key: string) => void
 *  - options: Array<{ key: string, label: string, detail: string }>
 */
import { DEFAULT_SORT_OPTIONS } from './sortOptions.js';

export default function SortMenu({
  isOpen = true,
  onClose,
  value = "task_newest",
  onChange,
  options = DEFAULT_SORT_OPTIONS,
}) {
  const menuRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        const trigger = e.target.closest('[data-sort-trigger="true"]');
        if (!trigger) {
          onClose?.();
        }
      }
    };

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="absolute! top-[calc(100%_+_8px)]! right-[0]! z-[1050]! [background-color:#FFFFFF]! rounded-[12px]! [border:1px_solid_#E5E7EB]! [box-shadow:0_10px_25px_-5px_rgba(0,_0,_0,_0.1),_0_8px_10px_-6px_rgba(0,_0,_0,_0.05)]! min-w-[220px]! p-[6px]! box-border! [font-family:-apple-system,_BlinkMacSystemFont,_'Segoe_UI',_Roboto,_'Inter',_sans-serif]! [animation:fadeInSortMenu_0.14s_ease-out_forwards]!"
      onClick={(e) => e.stopPropagation()}
      role="menu"
      aria-label="Sort options"
    >

      {options.map((opt) => {
        const isSelected = value === opt.key;
        return (
          <div
            key={opt.key}
            onClick={() => {
              onChange?.(opt.key);
              onClose?.();
            }}
            className={"flex! items-center! justify-between! p-[9px_12px]! rounded-[8px]! cursor-pointer! select-none! [transition:background-color_0.12s_ease]!" + ' ' + "hover:[background-color:#E5E7EB]!"} style={{
  backgroundColor: isSelected ? "#F3F4F6" : "transparent"
}}

            role="menuitemradio"
            aria-checked={isSelected}
          >
            {/* Left side: Checkmark (if selected) + Label */}
            <div className="flex! items-center! gap-[8px]!">
              {isSelected ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#1558D6"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0!"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <div className="w-[16px]! h-[16px]! shrink-0!" />
              )}
              <span className="text-[15px]! font-semibold! [color:#111827]! leading-[1.25]!">{opt.label}</span>
            </div>

            {/* Right side: Detail text ("Newest", "Oldest", etc.) */}
            <span className="text-[15px]! font-normal! [color:#6B7280]! leading-[1.25]! ml-[18px]!">{opt.detail}</span>
          </div>
        );
      })}
    </div>
  );
}
