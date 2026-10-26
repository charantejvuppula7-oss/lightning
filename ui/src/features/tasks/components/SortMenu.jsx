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
      style={styles.menuCard}
      onClick={(e) => e.stopPropagation()}
      role="menu"
      aria-label="Sort options"
    >
      <style>{`
        @keyframes fadeInSortMenu {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      {options.map((opt) => {
        const isSelected = value === opt.key;
        return (
          <div
            key={opt.key}
            onClick={() => {
              onChange?.(opt.key);
              onClose?.();
            }}
            style={{
              ...styles.menuItem,
              backgroundColor: isSelected ? "#F3F4F6" : "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#E5E7EB";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isSelected ? "#F3F4F6" : "transparent";
            }}
            role="menuitemradio"
            aria-checked={isSelected}
          >
            {/* Left side: Checkmark (if selected) + Label */}
            <div style={styles.leftGroup}>
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
                  style={styles.checkIcon}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <div style={styles.checkSpacer} />
              )}
              <span style={styles.itemLabel}>{opt.label}</span>
            </div>

            {/* Right side: Detail text ("Newest", "Oldest", etc.) */}
            <span style={styles.itemDetail}>{opt.detail}</span>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  menuCard: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    zIndex: 1050,
    backgroundColor: "#FFFFFF",
    borderRadius: "12px",
    border: "1px solid #E5E7EB",
    boxShadow:
      "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
    minWidth: "220px",
    padding: "6px",
    boxSizing: "border-box",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif",
    animation: "fadeInSortMenu 0.14s ease-out forwards",
  },
  menuItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "9px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    userSelect: "none",
    transition: "background-color 0.12s ease",
  },
  leftGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  checkIcon: {
    flexShrink: 0,
  },
  checkSpacer: {
    width: "16px",
    height: "16px",
    flexShrink: 0,
  },
  itemLabel: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#111827",
    lineHeight: "1.25",
  },
  itemDetail: {
    fontSize: "15px",
    fontWeight: "400",
    color: "#6B7280",
    lineHeight: "1.25",
    marginLeft: "18px",
  },
};
