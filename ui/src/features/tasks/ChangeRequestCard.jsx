import { useState } from "react";

// Exact Figma color codes

function formatRequestDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toLowerCase();
}

/**
 * ChangeRequestCard Component
 *
 * 3 versions determined by `variant` prop:
 * 1. "requested" → Active change requests (amber border + bullet points + attachment)
 * 2. "partial"   → Some changes completed, new ones pending (same card + expandable history)
 * 3. "completed" → Full change-request history (scrollable list)
 *
 * @param {Object} props
 * @param {'requested'|'partial'|'completed'} [props.variant="requested"]
 * @param {number} [props.count] - Number in title e.g. "Change Requested (2)"
 * @param {string} [props.date] - Date badge text e.g. "8 oct"
 * @param {Array<string>} [props.changes] - Current bullet-point change items
 * @param {Array<{name,size}>} [props.attachments] - File attachments
 * @param {Array<{title,date,changes,attachments}>} [props.history] - History items
 * @param {string} [props.className]
 * @param {Object} [props.style]
 */
export default function ChangeRequestCard({
  variant = "requested",
  count,
  date = "",
  changes = [],
  attachments = [],
  history = [],
  defaultExpanded = true,
  expanded,
  onToggle,
  className = "",
  style = {},
}) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded ?? true);
  const isExpanded = typeof expanded === "boolean" ? expanded : internalExpanded;

  const handleToggle = () => {
    const next = !isExpanded;
    if (typeof expanded !== "boolean") {
      setInternalExpanded(next);
    }
    onToggle?.(next);
  };

  const requests = history.length ? history : [{ date, changes, attachments }];
  const requestCount = count ?? requests.length;

  return (
    <>

      <div className={`cr-card ${isExpanded ? "cr-card--expanded" : "cr-card--collapsed"} ${className}`.trim()} style={style}>
        <div
          className="cr-card-header-toggle"
          onClick={handleToggle}
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Collapse change requests" : "Expand change requests"}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleToggle();
            }
          }}
        >
          <h4 className="cr-card-section-title">
            {variant === "completed" ? "Change Request History" : `Change Requested (${requestCount})`}
          </h4>
          <span className={`cr-card-chevron-btn ${isExpanded ? "cr-card-chevron-btn--open" : ""}`}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </span>
        </div>

        {isExpanded && requests.map((item, i) => (
          <section className="cr-card-request" key={`${item.requested_at || item.date || "request"}-${i}`}>
            <div className="cr-card-request-header">
              <h4 className="cr-card-request-title">
                {requestCount === 1 ? "Change Request" : `Change Request ${requestCount - i}`}
              </h4>
              <span className="cr-card-entry-date">{formatRequestDate(item.date)}</span>
            </div>
            {item.changes?.length > 0 && (
              <ul className="cr-card-list">
                {item.changes.map((change, j) => (
                  <li key={j}>
                    <span className="cr-card-change-text">{change}</span>
                  </li>
                ))}
              </ul>
            )}
            {item.attachments?.map((att, j) => (
              <button type="button" className="cr-card-attachment" key={j}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                {att.name}{att.size ? ` · ${att.size}` : ""}
              </button>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}

export { ChangeRequestCard };
