

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
