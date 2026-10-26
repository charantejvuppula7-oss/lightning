export function Avatar({ name = "", size = 36, isOnline = undefined, showBadge = false }) {
  const initials =
    name.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
  const COLORS = [
    "var(--color-indigo)", "#8b5cf6", "#ec4899", "var(--color-warning)",
    "var(--color-success)", "var(--color-primary-light)", "var(--color-danger)", "#14b8a6", "var(--color-role-pm)", "#0ea5e9",
  ];
  const bg = COLORS[(name.charCodeAt(0) || 0) % COLORS.length];
  const shouldShow = showBadge || isOnline !== undefined;
  const badgeSize = Math.max(8, Math.round(size * 0.28));

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div title={name} style={{
        width: size, height: size, borderRadius: "50%", background: bg,
        color: "var(--color-white)", fontWeight: 700, fontSize: size * 0.38,
        display: "flex", alignItems: "center", justifyContent: "center",
        userSelect: "none",
        border: "2px solid var(--color-white)", boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
      }}>
        {initials}
      </div>
      {shouldShow && (
        <span
          style={{
            position: "absolute",
            bottom: -1,
            right: -1,
            width: badgeSize,
            height: badgeSize,
            borderRadius: "50%",
            background: isOnline ? "var(--color-success-alt)" : "var(--color-slate-400)",
            border: "2px solid var(--color-white)",
            boxShadow: isOnline ? "0 0 0 1px rgba(34, 197, 94, 0.4)" : "none",
            transition: "all 0.2s ease",
            zIndex: 2,
          }}
          title={isOnline ? "Online" : "Offline"}
        />
      )}
    </div>
  );
}

function RedPdfIcon({ size = 24 }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 20 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M3 1C1.9 1 1 1.9 1 3V21C1 22.1 1.9 23 3 23H17C18.1 23 19 22.1 19 21V7L13 1H3Z" fill="#EA4335" />
      <path d="M13 1V7H19L13 1Z" fill="#F87171" opacity="0.9" />
      <path d="M5 14H7.5C8.3 14 9 13.3 9 12.5C9 11.7 8.3 11 7.5 11H5V17H6.5V14.8" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M11 11H12.5C13.9 11 15 12.1 15 13.5V14.5C15 15.9 13.9 17 12.5 17H11V11Z" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function PeopleIcon({ size = 18, color = "var(--color-slate-600)" }) {
  return (
    <svg width={size} height={size * 0.88} viewBox="0 0 20 18" fill="none" style={{ flexShrink: 0 }}>
      {/* Front person */}
      <circle cx="7" cy="5" r="3.2" fill={color} />
      <path
        d="M0.5 16C0.5 12.5 3.4 9.8 7 9.8C10.6 9.8 13.5 12.5 13.5 16C13.5 16.55 13.05 17 12.5 17H1.5C0.95 17 0.5 16.55 0.5 16Z"
        fill={color}
      />
      {/* Back person */}
      <circle cx="14" cy="4.5" r="2.7" fill={color} opacity="0.85" />
      <path
        d="M14 9.2C15.8 9.5 18 11.2 18 14.5C18 15.05 17.6 15.5 17.1 15.5H14.5C14.8 14.8 15 14 15 13.2C15 11.6 14.3 10.2 13.2 9.3C13.5 9.25 13.7 9.2 14 9.2Z"
        fill={color}
        opacity="0.85"
      />
    </svg>
  );
}

export function PushPinIcon({ size = 18, color = "var(--color-slate-600)" }) {
  return (
    <svg width={size * 0.75} height={size} viewBox="0 0 15 20" fill="none" style={{ flexShrink: 0 }}>
      <path
        d="M1.5 2H13.5M3.5 2V7.5L1.5 10.5V12.5H13.5V10.5L11.5 7.5V2M7.5 12.5V19"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FileIcon({ name = "", size = 28 }) {
  const ext = (name || "").split(".").pop().toLowerCase();
  if (ext === "fig" || ext === "figma") {
    return (
      <svg width={size * 0.7} height={size} viewBox="0 0 38 57" fill="none" style={{ flexShrink: 0 }}>
        <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE"/>
        <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83"/>
        <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262"/>
        <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E"/>
        <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF"/>
      </svg>
    );
  }
  if (ext === "pdf") {
    return <RedPdfIcon size={size * 0.85} />;
  }
  const map = {
    pdf: "var(--color-danger)", doc: "var(--color-primary-light)", docx: "var(--color-primary-light)",
    xls: "var(--color-success)", xlsx: "var(--color-success)", ppt: "var(--color-warning)", pptx: "var(--color-warning)",
    zip: "#8b5cf6", rar: "#8b5cf6", txt: "var(--color-slate-500)", csv: "var(--color-success)",
    png: "var(--color-indigo)", jpg: "var(--color-indigo)", jpeg: "var(--color-indigo)",
  };
  const icon_map = {
    pdf: "picture_as_pdf", doc: "description", docx: "description",
    xls: "table_chart", xlsx: "table_chart", ppt: "slideshow", pptx: "slideshow",
    zip: "folder_zip", rar: "folder_zip", txt: "text_snippet",
    png: "image", jpg: "image", jpeg: "image",
  };
  return (
    <span className="material-symbols-outlined" style={{ fontSize: size, color: map[ext] || "var(--color-slate-500)" }}>
      {icon_map[ext] || "insert_drive_file"}
    </span>
  );
}

function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return "0 KB";
  const num = Number(bytes);
  if (num >= 1024 * 1024) {
    return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(num / 1024))} KB`;
}

function getFileCategoryLabel(name = "", type = "") {
  const ext = (name || "").split(".").pop().toLowerCase();
  if (ext === "fig" || ext === "figma") return "Figma File";
  if (ext === "pdf") return "PDF";
  if (["doc", "docx"].includes(ext)) return "Word Document";
  if (["xls", "xlsx", "csv"].includes(ext)) return "Spreadsheet";
  if (["ppt", "pptx"].includes(ext)) return "Presentation";
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "Image";
  return (type || ext || "File").toUpperCase();
}


export function MessageText({ content = '' }) {
  return content.split(/(\*\*[^*]+\*\*|_[^_]+_|@[A-Za-z0-9_.-]+)/g).map((part,index) =>
    part.startsWith('**') ? <strong key={index}>{part.slice(2,-2)}</strong> : part.startsWith('_') ? <em key={index}>{part.slice(1,-1)}</em> : part.startsWith('@') ? <mark key={index}>{part}</mark> : part)
}

export function FileCard({ message, pinned, onPin }) {
  return <div className="chat-file-card">
    <a className="chat-attachment file-card" href={message.attachment_url} download>
      <FileIcon name={message.attachment_name} size={28} />
      <span>{message.attachment_name || 'Download attachment'}<small>{getFileCategoryLabel(message.attachment_name)}{message.attachment_size ? ` - ${formatFileSize(message.attachment_size)}` : ''}</small></span>
      <span className="material-symbols-outlined">download</span>
    </a>
    {onPin && <button aria-label={pinned ? 'Unpin file' : 'Pin file'} title={pinned ? 'Unpin file' : 'Pin file'} onClick={onPin}><PushPinIcon size={17} color={pinned ? 'var(--color-primary)' : 'var(--color-slate-400)'} /></button>}
  </div>
}
