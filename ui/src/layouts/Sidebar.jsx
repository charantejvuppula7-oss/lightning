import { useEffect, useState } from 'react'
import logo from '../assets/lightning-logo-light.png'
import icon from '../assets/lightning-icon.png'

const links = [
  ['Dashboard', 'dashboard', '#'], ['Projects', 'projects', '#'], ['Tasks', 'tasks', '/tasks'],
  ['Dependencies', 'dependencies', '/dependencies'], ['Users', 'users', '#'], ['Chat', 'chat', '/chat'],
  ['Approvals', 'approvals', '#'], ['Workload', 'workload', '#'], ['Roles & Permissions', 'roles', '#'], ['Calendar', 'calendar', '/calendar'],
  ['Document', 'document', '#'], ['Audit logs', 'audit', '#'],
]

const iconPaths = {
  dashboard: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M9 9h12" /></>,
  projects: <><path d="M3 7h7l2 2h9l-2 11H3z" /><path d="M3 7V5h7l2 2" /></>,
  tasks: <><rect x="4" y="4" width="16" height="17" rx="2" /><path d="M9 4V2m6 2V2M8 12l2 2 5-5" /></>,
  dependencies: <><rect x="3" y="3" width="6" height="6" /><rect x="15" y="3" width="6" height="6" /><rect x="15" y="15" width="6" height="6" /><path d="M9 6h6m-3 0v12h3" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1zM16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v1" /></>,
  chat: <><path d="M4 4h16v13H8l-4 4z" /><path d="M8 8h8M8 12h8" /></>,
  approvals: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="m7 9 1.5 1.5L11 8m2 1h4m-10 5 1.5 1.5L11 13m2 1h4" /></>,
  workload: <><path d="M4 20v-5m5 5V9m5 11V4m5 16v-9" /><path d="m3 11 6-5 4 2 7-6" /></>,
  roles: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z" /><circle cx="12" cy="10" r="2" /><path d="M9 16a3 3 0 0 1 6 0" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18" /></>,
  document: <><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5m-9 4h5m-5 4h5" /></>,
  audit: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5m4-1v5l4 2" /></>,
}

function SidebarIcon({ name }) {
  return <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths[name]}</svg>
}

export default function Sidebar({ active, effectiveRole = 'user' }) {
  const storageKey = `${effectiveRole}-sidebar-collapsed`
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(storageKey) === 'true')
  const [selected, setSelected] = useState(null)
  useEffect(() => setSelected(null), [active])
  const toggleCollapsed = () => setCollapsed(value => {
    localStorage.setItem(storageKey, String(!value))
    return !value
  })
  const sidebarWidth = collapsed ? '68px' : effectiveRole === 'admin' ? '240px' : '220px'
  const sidebarPadding = collapsed
    ? effectiveRole === 'admin' ? '20px 8px' : '16px 8px'
    : effectiveRole === 'admin' ? '20px 16px' : '16px 14px'

  return <aside className={`sidebar${collapsed ? ' collapsed' : ''}`} style={{ width: sidebarWidth, minWidth: sidebarWidth, flexBasis: sidebarWidth, padding: sidebarPadding }}>
    <div className="sidebar-brand"><img src={collapsed ? icon : logo} alt="Lightning PDPM" /><button onClick={toggleCollapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}>{collapsed ? '›' : '‹'}</button></div>
    <nav className="sidebar-nav" aria-label="Main navigation">{links.map(([label, icon, href]) => <a key={label} href={href} title={collapsed ? label : undefined} onClick={() => setSelected(href === '#' ? label : null)} className={`sidebar-link${active === href || selected === label ? ' active' : ''}`}><SidebarIcon name={icon} /><span className="sidebar-label">{label}</span></a>)}</nav>
    <button className="sidebar-logout"><span className="logout-icon">⇥</span><span className="sidebar-label">Logout</span></button>
  </aside>
}
