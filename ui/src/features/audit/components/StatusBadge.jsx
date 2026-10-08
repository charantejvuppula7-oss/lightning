

/* styling */
const tailwindStyling = {
  "admin-badge": [
    "[display:inline-block]",
    "[padding:2px_8px]",
    "[border-radius:20px]",
    "[font-size:11px]",
    "[font-weight:700]",
    "[text-transform:uppercase]",
    "[letter-spacing:.04em]",
    "[white-space:nowrap]"
  ]
}
const styling = value => {
  const classes = typeof value === 'string' ? value : ''
  const utilities = classes.split(/\s+/).flatMap(name => tailwindStyling[name] || [])
  return [...new Set([...classes.split(/\s+/), ...utilities])].filter(Boolean).join(' ')
}

/**
 * StatusBadge — coloured pill for HTTP status codes and action labels.
 *
 * Props:
 *   value – number (HTTP status) or string (action name)
 *   type  – 'status' | 'action' | 'method'
 */
export default function StatusBadge({ value, type = 'status' }) {
  const cls = getBadgeClass(value, type)
  return <span className={styling(`admin-badge admin-badge-${cls}`)}>{value}</span>
}

function getBadgeClass(value, type) {
  if (type === 'method') {
    const m = String(value).toUpperCase()
    if (m === 'GET')    return 'blue'
    if (m === 'POST')   return 'green'
    if (m === 'PUT' || m === 'PATCH') return 'yellow'
    if (m === 'DELETE') return 'red'
    return 'neutral'
  }
  if (type === 'status') {
    const s = Number(value)
    if (s >= 500) return 'red'
    if (s >= 400) return 'yellow'
    if (s >= 300) return 'blue'
    if (s >= 200) return 'green'
    return 'neutral'
  }
  // action
  const action = String(value).toLowerCase()
  if (['deleted', 'access_denied', 'login_failed'].includes(action)) return 'red'
  if (['created', 'login', 'completed'].includes(action)) return 'green'
  if (['updated', 'status_changed', 'reassigned'].includes(action)) return 'yellow'
  return 'blue'
}
