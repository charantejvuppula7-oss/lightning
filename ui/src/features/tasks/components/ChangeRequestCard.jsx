import { useState } from "react";

// Exact Figma color codes
const COLORS = {
  border: "#E8B14E",       // Left amber accent border
  title: "#E8A308",        // Amber title "Change Requested (N)"
  titleCompleted: "#E8A308", // History title
  badge: "#FBBF24",        // Date badge bg
  badgeText: "#92400E",    // Date badge text
  cardBg: "#FFFFFF",       // Card background
  historyBg: "#F3F4F6",    // History section bg
  bodyText: "#374151",     // Bullet point body text
  attachIcon: "#D97706",   // Attachment link color
  attachText: "#B45309",   // Attachment text
  divider: "#E5E7EB",      // Dividers
  headerText: "#111827",   // History item header
  subText: "#6B7280",      // Dates and secondary text
  chevron: "#6B7280",      // Expand chevron
};

const STYLES = `
  .cr-card {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    border-left: 2px solid ${COLORS.border};
    background: ${COLORS.cardBg};
    padding: 0 8px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    width: 100%;
    margin-bottom: 8px;
  }
  .cr-card--expanded {
    max-height: 200px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #CBD5E1 transparent;
  }
  .cr-card--collapsed {
    max-height: none;
    overflow: hidden;
  }
  .cr-card::-webkit-scrollbar {
    width: 5px;
  }
  .cr-card::-webkit-scrollbar-thumb {
    background: #CBD5E1;
    border-radius: 3px;
  }

  .cr-card-header-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 6px;
    border-bottom: 1px solid ${COLORS.divider};
    background: ${COLORS.cardBg};
    cursor: pointer;
    user-select: none;
    position: sticky;
    top: 0;
    z-index: 1;
    outline: none;
    transition: opacity 0.15s ease;
  }
  .cr-card-header-toggle:hover {
    opacity: 0.9;
  }
  .cr-card-section-title {
    margin: 0;
    padding: 0;
    color: ${COLORS.title};
    font-size: 13.5px;
    font-weight: 700;
  }
  .cr-card-chevron-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #111827;
    transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1), color 0.15s ease;
  }
  .cr-card-chevron-btn--open {
    transform: rotate(90deg);
  }

  .cr-card-request {
    padding: 7px 6px;
  }
  .cr-card-request + .cr-card-request {
    border-top: 1px solid #D1D5DB;
  }
  .cr-card-request-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 6px;
  }
  .cr-card-request-title {
    font-size: 13px;
    font-weight: 500;
    color: ${COLORS.headerText};
    margin: 0;
  }
  .cr-card-entry-date {
    font-size: 12px;
    color: ${COLORS.subText};
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* Bullet list of requested changes */
  .cr-card-list {
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .cr-card-list li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    column-gap: 12px;
    font-size: 12px;
    color: ${COLORS.bodyText};
    line-height: 1.45;
    list-style: none;
    padding: 2px 0;
  }
  .cr-card-change-text::before {
    content: "•";
    color: ${COLORS.subText};
    margin-right: 6px;
  }
  /* Attachment link */
  .cr-card-attachment {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: #2563EB;
    text-decoration: none;
    cursor: pointer;
    border: 0;
    padding: 0;
    background: none;
    font-family: inherit;
    transition: opacity 0.15s ease;
    margin-top: 2px;
  }
  .cr-card-attachment:hover {
    opacity: 0.8;
    text-decoration: underline;
  }

  /* Expand toggle for history */
  .cr-card-expand-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: ${COLORS.headerText};
    padding: 6px 0;
    margin: 0;
    outline: none;
    transition: color 0.15s ease;
  }
  .cr-card-expand-btn:hover {
    color: ${COLORS.title};
  }
  .cr-card-expand-icon {
    display: inline-flex;
    transition: transform 0.2s ease;
  }
  .cr-card-expand-icon--open {
    transform: rotate(180deg);
  }

  /* History dropdown */
  .cr-card-history {
    background: ${COLORS.historyBg};
    border-radius: 8px;
    padding: 0;
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.28s cubic-bezier(0.4, 0, 0.2, 1), padding 0.22s ease;
    box-sizing: border-box;
  }
  .cr-card-history--open {
    max-height: 260px;
    padding: 12px 14px;
    overflow-y: auto;
  }
  .cr-card-history--open::-webkit-scrollbar {
    width: 4px;
  }
  .cr-card-history--open::-webkit-scrollbar-thumb {
    background: #CBD5E1;
    border-radius: 2px;
  }

  /* Individual history item */
  .cr-history-item {
    padding: 10px 0;
    border-bottom: 1px solid ${COLORS.divider};
  }
  .cr-history-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
  .cr-history-item:first-child {
    padding-top: 0;
  }
  .cr-history-item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
  }
  .cr-history-item-title {
    font-size: 13px;
    font-weight: 600;
    color: ${COLORS.headerText};
    margin: 0;
  }
  .cr-history-item-date {
    font-size: 11px;
    color: ${COLORS.subText};
    flex-shrink: 0;
  }
  .cr-history-item-list {
    margin: 0;
    padding: 0 0 0 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .cr-history-item-list li {
    font-size: 12px;
    color: ${COLORS.bodyText};
    line-height: 1.4;
  }

  /* ─── VERSION 3: Full history card (completed task) ─── */
  .cr-history-card {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    border: 1px solid #E5E7EB;
    border-radius: 8px;
    background: ${COLORS.historyBg};
    padding: 14px 16px;
    box-sizing: border-box;
    max-width: 420px;
    width: 100%;
    max-height: 320px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
  .cr-history-card::-webkit-scrollbar {
    width: 4px;
  }
  .cr-history-card::-webkit-scrollbar-thumb {
    background: #CBD5E1;
    border-radius: 2px;
  }
  .cr-history-card-title {
    font-size: 13px;
    font-weight: 700;
    color: ${COLORS.title};
    margin: 0 0 10px 0;
    position: sticky;
    top: 0;
    background: ${COLORS.historyBg};
    padding-bottom: 4px;
  }
`;

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
      <style>{STYLES}</style>
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
