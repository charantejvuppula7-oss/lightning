export const sidebarStorageKey = 'lighting-sidebar-collapsed'

export function readSidebarCollapsed(role) {
  try {
    const saved = localStorage.getItem(sidebarStorageKey)
    if (saved !== null) return saved === 'true'
    const legacy = (role === 'user' ? ['dev-sidebar-collapsed', 'user-sidebar-collapsed'] : [`${role}-sidebar-collapsed`])
      .map(key => localStorage.getItem(key)).find(value => value !== null)
    if (legacy !== undefined) localStorage.setItem(sidebarStorageKey, legacy)
    return legacy === 'true'
  } catch { return false }
}
