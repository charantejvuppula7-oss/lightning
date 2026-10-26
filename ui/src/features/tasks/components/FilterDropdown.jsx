import { useEffect, useRef } from "react";

/**
 * FilterDropdown Component
 *
 * Matches the design:
 * - Due Date: Any Date, Overdue (count), Today (count), Next 7 days (count)
 * - Status: Assigned, In-progress, In-review, Change requested, Completed
 * - Priority: High, Medium, Low
 * - Footer: "clear all" and "Done" button
 *
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - filters: { dueDate: string, statuses: string[], priorities: string[] }
 *  - onChange: (filters) => void
 *  - onApply: (filters) => void
 *  - onClear: () => void
 *  - counts: { overdue: number, today: number, next7Days: number }
 */
export default function FilterDropdown({
  isOpen = true,
  onClose,
  filters = { dueDate: "any", statuses: [], priorities: [] },
  onChange,
  onApply,
  onClear,
  counts = { overdue: 0, today: 0, next7Days: 0 },
}) {
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        // Check if the click was on the trigger button itself
        const trigger = e.target.closest('[data-filter-trigger="true"]');
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

  const currentDueDate = filters.dueDate || "any";
  const currentStatuses = Array.isArray(filters.statuses) ? filters.statuses : [];
  const currentPriorities = Array.isArray(filters.priorities) ? filters.priorities : [];

  const handleSelectDueDate = (val) => {
    if (val === "any") {
      onChange?.({ dueDate: "any", statuses: [], priorities: [] });
      return;
    }
    const next = {
      ...filters,
      dueDate: val,
    };
    onChange?.(next);
  };

  const handleToggleStatus = (statusVal) => {
    const exists = currentStatuses.includes(statusVal);
    // Status is a single-choice filter: selecting another option replaces it.
    const updated = exists ? [] : [statusVal];
    const next = {
      ...filters,
      statuses: updated,
    };
    onChange?.(next);
  };

  const handleTogglePriority = (pVal) => {
    const exists = currentPriorities.includes(pVal);
    // Priority is a single-choice filter: selecting another option replaces it.
    const updated = exists ? [] : [pVal];
    const next = {
      ...filters,
      priorities: updated,
    };
    onChange?.(next);
  };

  const handleClearAll = () => {
    const reset = {
      dueDate: "any",
      statuses: [],
      priorities: [],
    };
    if (onClear) {
      onClear();
    } else {
      onChange?.(reset);
    }
  };

  const handleDone = () => {
    if (onApply) {
      onApply(filters);
    } else {
      onClose?.();
    }
  };

  const getPillStyle = (isSelected) => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "7px 13px",
    borderRadius: "8px",
    fontSize: "13.5px",
    fontWeight: isSelected ? "500" : "400",
    color: isSelected ? "#FFFFFF" : "#4B5563",
    backgroundColor: isSelected ? "#1558D6" : "#FFFFFF",
    border: isSelected ? "1px solid #1558D6" : "1px solid #D1D5DB",
    cursor: "pointer",
    userSelect: "none",
    transition: "all 0.14s ease",
    whiteSpace: "nowrap",
    lineHeight: "1.25",
  });

  return (
    <div
      ref={dropdownRef}
      style={styles.dropdownCard}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Section 1: Due Date ── */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Due Date</div>
        <div style={styles.pillsRow}>
          <button
            type="button"
            onClick={() => handleSelectDueDate("any")}
            style={getPillStyle(currentDueDate === "any")}
          >
            Any Date
          </button>
          <button
            type="button"
            onClick={() => handleSelectDueDate("overdue")}
            style={getPillStyle(currentDueDate === "overdue")}
          >
            Overdue ({counts.overdue ?? 0})
          </button>
          <button
            type="button"
            onClick={() => handleSelectDueDate("today")}
            style={getPillStyle(currentDueDate === "today")}
          >
            Today ({counts.today ?? 0})
          </button>
        </div>
        <div style={{ ...styles.pillsRow, marginTop: "8px" }}>
          <button
            type="button"
            onClick={() => handleSelectDueDate("next_7_days")}
            style={getPillStyle(currentDueDate === "next_7_days")}
          >
            Next 7 days ({counts.next7Days ?? 0})
          </button>
        </div>
      </div>

      <div style={styles.divider} />

      {/* ── Section 2: Status ── */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Status</div>
        <div style={styles.pillsRow}>
          <button
            type="button"
            onClick={() => handleToggleStatus("assigned")}
            style={getPillStyle(currentStatuses.includes("assigned"))}
          >
            Assigned
          </button>
          <button
            type="button"
            onClick={() => handleToggleStatus("in_progress")}
            style={getPillStyle(currentStatuses.includes("in_progress"))}
          >
            In-progress
          </button>
          <button
            type="button"
            onClick={() => handleToggleStatus("in_review")}
            style={getPillStyle(currentStatuses.includes("in_review"))}
          >
            In-review
          </button>
        </div>
        <div style={{ ...styles.pillsRow, marginTop: "8px" }}>
          <button
            type="button"
            onClick={() => handleToggleStatus("change_requested")}
            style={getPillStyle(currentStatuses.includes("change_requested"))}
          >
            Change requested
          </button>
          <button
            type="button"
            onClick={() => handleToggleStatus("completed")}
            style={getPillStyle(currentStatuses.includes("completed"))}
          >
            Completed
          </button>
        </div>
      </div>

      <div style={styles.divider} />

      {/* ── Section 3: Priority ── */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Priority</div>
        <div style={styles.pillsRow}>
          <button
            type="button"
            onClick={() => handleTogglePriority("high")}
            style={getPillStyle(currentPriorities.includes("high"))}
          >
            High
          </button>
          <button
            type="button"
            onClick={() => handleTogglePriority("medium")}
            style={getPillStyle(currentPriorities.includes("medium"))}
          >
            Medium
          </button>
          <button
            type="button"
            onClick={() => handleTogglePriority("low")}
            style={getPillStyle(currentPriorities.includes("low"))}
          >
            Low
          </button>
        </div>
      </div>

      <div style={styles.divider} />

      {/* ── Footer: clear all & Done ── */}
      <div style={styles.footer}>
        <button
          type="button"
          onClick={handleClearAll}
          style={styles.clearAllBtn}
        >
          clear all
        </button>
        <button
          type="button"
          onClick={handleDone}
          style={styles.doneBtn}
        >
          Done
        </button>
      </div>
    </div>
  );
}

const styles = {
  dropdownCard: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    zIndex: 1050,
    backgroundColor: "#FFFFFF",
    borderRadius: "12px",
    border: "1px solid #E5E7EB",
    boxShadow:
      "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
    width: "326px",
    maxWidth: "92vw",
    padding: "18px 20px 16px 20px",
    boxSizing: "border-box",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif",
    animation: "fadeInDropdown 0.15s ease-out forwards",
  },
  section: {
    display: "flex",
    flexDirection: "column",
  },
  sectionTitle: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#111827",
    marginBottom: "10px",
    lineHeight: "1.2",
  },
  pillsRow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px",
  },
  divider: {
    height: "1px",
    backgroundColor: "#E5E7EB",
    margin: "14px 0",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: "2px",
  },
  clearAllBtn: {
    background: "none",
    border: "none",
    color: "#6B7280",
    fontSize: "14px",
    cursor: "pointer",
    padding: "4px 2px",
    fontWeight: "400",
    textDecoration: "none",
    outline: "none",
    transition: "color 0.12s",
  },
  doneBtn: {
    backgroundColor: "#1558D6",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "8px",
    padding: "8px 24px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(21, 88, 214, 0.25)",
    transition: "background-color 0.15s, transform 0.1s",
  },
};
