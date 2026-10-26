

// Avatar colors used by the task UI.
const USER_AVATAR_COLORS = [
  "#C5A45F",
  "#82B58B",
  "#5F89C5",
  "#B45FC5",
];

// Helper: Pick a consistent color from name
function getAvatarColor(name = "", colorOverride) {
  if (colorOverride) return colorOverride;
  if (!name) return USER_AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % USER_AVATAR_COLORS.length;
  return USER_AVATAR_COLORS[idx];
}

// Helper: Generate 2-letter initials
function getInitials(name = "", fallback = "U") {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const STYLES = `
  .user-card-wrapper {
    position: relative;
    display: inline-flex;
    align-items: center;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  /* Avatar Circle (Default View) */
  .user-avatar-circle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: #000000;
    font-weight: 600;
    letter-spacing: -0.01em;
    user-select: none;
    cursor: pointer;
    flex-shrink: 0;
    transition: transform 0.18s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.18s ease;
    border: none;
    outline: none;
    box-sizing: border-box;
    padding: 0;
  }

  .user-avatar-circle:hover {
    transform: scale(1.08);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    z-index: 20;
  }

  .user-avatar-circle:focus-visible {
    box-shadow: 0 0 0 3px rgba(95, 137, 197, 0.4);
  }

  /* Avatar Sizes */
  .user-avatar-circle--sm {
    width: 32px;
    height: 32px;
    font-size: 13px;
  }
  .user-avatar-circle--md {
    width: 44px;
    height: 44px;
    font-size: 17px;
  }
  .user-avatar-circle--lg {
    width: 56px;
    height: 56px;
    font-size: 21px;
  }

  /* Floating Popover Card on Hover */
  .user-hover-card {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%) translateY(4px);
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    padding: 10px 14px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    visibility: hidden;
    transition: opacity 0.18s ease, transform 0.18s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.18s;
    z-index: 100;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 3px;
  }

  /* Triangle Pointer Arrow */
  .user-hover-card::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-width: 5px;
    border-style: solid;
    border-color: #FFFFFF transparent transparent transparent;
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.08));
  }

  .user-card-wrapper:hover .user-hover-card,
  .user-card-wrapper:focus-within .user-hover-card,
  .user-hover-card--visible {
    opacity: 1;
    pointer-events: auto;
    visibility: visible;
    transform: translateX(-50%) translateY(0);
  }

  .user-hover-card-name {
    font-size: 13px;
    font-weight: 700;
    color: #0F172A;
    line-height: 1.25;
  }

  .user-hover-card-role {
    font-size: 11px;
    font-weight: 500;
    color: #64748B;
    background: #F1F5F9;
    padding: 2px 7px;
    border-radius: 4px;
    line-height: 1.2;
    margin-top: 2px;
  }

  /* Optional Pill Variant (expands inline on hover) */
  .user-card-pill {
    display: inline-flex;
    align-items: center;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 9999px;
    padding: 3px 12px 3px 3px;
    gap: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .user-card-pill:hover {
    background: #F1F5F9;
    border-color: #CBD5E1;
  }
  .user-card-pill-info {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
    text-align: left;
  }
  .user-card-pill-name {
    font-size: 13px;
    font-weight: 600;
    color: #0F172A;
  }
  .user-card-pill-role {
    font-size: 11px;
    color: #64748B;
  }
`;

/**
 * UserCard Component
 *
 * Shows a user's avatar and hover details.
 * By default, displays only the circular avatar with initials.
 * On hover, shows an elegant card/tooltip with the user's Name and Role.
 *
 * @param {Object} props
 * @param {string} [props.name] - User full name
 * @param {string} [props.role] - User role (e.g. "Project Manager", "Developer")
 * @param {string} [props.initials] - Initials shown in the avatar
 * @param {string} [props.color] - Custom background hex color
 * @param {'sm'|'md'|'lg'} [props.size="md"] - Size of avatar
 * @param {'popover'|'pill'} [props.variant="popover"] - "popover" (hover card) or "pill" (inline name+role)
 * @param {function} [props.onClick] - Click handler
 */
export default function UserCard({
  name = "",
  role = "",
  initials,
  color,
  size = "md",
  variant = "popover",
  onClick,
  className = "",
  style = {},
  ...restProps
}) {
  const displayInitials = initials || getInitials(name);
  const avatarBg = color || getAvatarColor(name || initials);

  if (variant === "pill") {
    return (
      <>
        <style>{STYLES}</style>
        <div
          className={`user-card-pill ${className}`.trim()}
          onClick={onClick}
          style={style}
          {...restProps}
        >
          <span
            className={`user-avatar-circle user-avatar-circle--sm`}
            style={{ backgroundColor: avatarBg }}
          >
            {displayInitials}
          </span>
          <div className="user-card-pill-info">
            <span className="user-card-pill-name">{name}</span>
            {role && <span className="user-card-pill-role">{role}</span>}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{STYLES}</style>
      <div
        className={`user-card-wrapper ${className}`.trim()}
        style={style}
        {...restProps}
      >
        {/* Avatar Circle */}
        <button
          type="button"
          className={`user-avatar-circle user-avatar-circle--${size}`}
          style={{ backgroundColor: avatarBg }}
          onClick={onClick}
          aria-label={`${name} - ${role}`}
        >
          {displayInitials}
        </button>

        {/* Hover Popover Card showing Name and Role */}
        <div className="user-hover-card" role="tooltip">
          <span className="user-hover-card-name">{name}</span>
          {role && <span className="user-hover-card-role">{role}</span>}
        </div>
      </div>
    </>
  );
}

export { UserCard, UserCard as UserAvatar };
