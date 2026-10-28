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
  assignees,
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
      onChange?.({ dueDate: "any", statuses: [], priorities: [], assignedTo: '' });
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
      assignedTo: '',
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
      className="absolute! top-[calc(100%_+_8px)]! right-[0]! z-[1050]! [background-color:#FFFFFF]! rounded-[12px]! [border:1px_solid_#E5E7EB]! [box-shadow:0_10px_25px_-5px_rgba(0,_0,_0,_0.1),_0_8px_10px_-6px_rgba(0,_0,_0,_0.05)]! w-[326px]! max-w-[92vw]! p-[18px_20px_16px_20px]! box-border! [font-family:-apple-system,_BlinkMacSystemFont,_'Segoe_UI',_Roboto,_'Inter',_sans-serif]! [animation:fadeInDropdown_0.15s_ease-out_forwards]!"
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Section 1: Due Date ── */}
      <div className="flex! flex-col!">
        <div className="text-[15px]! font-bold! [color:#111827]! mb-[10px]! leading-[1.2]!">Due Date</div>
        <div className="flex! items-center! flex-wrap! gap-[8px]!">
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
        <div className="flex! items-center! flex-wrap! gap-[8px]! mt-[8px]!">
          <button
            type="button"
            onClick={() => handleSelectDueDate("next_7_days")}
            style={getPillStyle(currentDueDate === "next_7_days")}
          >
            Next 7 days ({counts.next7Days ?? 0})
          </button>
        </div>
      </div>

      <div className="h-[1px]! [background-color:#E5E7EB]! m-[14px_0]!" />

      {/* ── Section 2: Status ── */}
      <div className="flex! flex-col!">
        <div className="text-[15px]! font-bold! [color:#111827]! mb-[10px]! leading-[1.2]!">Status</div>
        <div className="flex! items-center! flex-wrap! gap-[8px]!">
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
        <div className="flex! items-center! flex-wrap! gap-[8px]! mt-[8px]!">
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

      <div className="h-[1px]! [background-color:#E5E7EB]! m-[14px_0]!" />

      {/* ── Section 3: Priority ── */}
      <div className="flex! flex-col!">
        <div className="text-[15px]! font-bold! [color:#111827]! mb-[10px]! leading-[1.2]!">Priority</div>
        <div className="flex! items-center! flex-wrap! gap-[8px]!">
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

      <div className="h-[1px]! [background-color:#E5E7EB]! m-[14px_0]!" />

      {assignees &&
        <label className="flex! flex-col! gap-[10px]! mb-[14px]! text-[15px]! font-bold! text-[#111827]!">
          Assigned to
          <select aria-label="Assigned to" value={filters.assignedTo || ''}
            onChange={event => onChange?.({ ...filters, assignedTo: event.target.value })}
            className="w-full! rounded-[8px]! border! border-[#D1D5DB]! bg-white! p-[8px_10px]! text-[13px]! font-normal! text-[#4B5563]!">
            <option value="">Anyone</option>
            {assignees.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
        </label>
      }
      {/* ── Footer: clear all & Done ── */}
      <div className="flex! items-center! justify-between! pt-[2px]!">
        <button
          type="button"
          onClick={handleClearAll}
          className="[background:none]! border-0! [color:#6B7280]! text-[14px]! cursor-pointer! p-[4px_2px]! font-normal! no-underline! outline-none! [transition:color_0.12s]!"
        >
          clear all
        </button>
        <button
          type="button"
          onClick={handleDone}
          className="[background-color:#1558D6]! [color:#FFFFFF]! border-0! rounded-[8px]! p-[8px_24px]! text-[14px]! font-semibold! cursor-pointer! [box-shadow:0_1px_2px_rgba(21,_88,_214,_0.25)]! [transition:background-color_0.15s,_transform_0.1s]!"
        >
          Done
        </button>
      </div>
    </div>
  );
}
