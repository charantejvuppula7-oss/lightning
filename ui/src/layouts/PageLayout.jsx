import { useLocation } from 'react-router-dom'
import { roleSlug } from '../utils/roles.js'
import Navbar from './Navbar.jsx'
import Sidebar from './Sidebar.jsx'

/* styling */
const tailwindStyling = {
  "app-shell": [
    "[min-height:100dvh]",
    "[display:flex]",
    "[background:var(--color-slate-50)]",
    "[color:var(--color-slate-900)]"
  ],
  "main-column": [
    "[min-width:0]",
    "[flex:1]",
    "[display:flex]",
    "[flex-direction:column]"
  ],
  "page-body": [
    "[min-width:0]",
    "[flex:1]"
  ]
}
const styling = value => {
  const classes = typeof value === 'string' ? value : ''
  const utilities = classes.split(/\s+/).flatMap(name => tailwindStyling[name] || [])
  return [...new Set([...classes.split(/\s+/), ...utilities])].filter(Boolean).join(' ')
}



export default function PageLayout({ user, children, searchQuery, onSearchChange }) {
  const { pathname } = useLocation()
  const slug = user ? roleSlug(user.role) : pathname.startsWith('/admin/') ? 'admin' : pathname.startsWith('/pm/') ? 'pm' : 'user'
  return <div className={styling("app-shell")}>
    <Sidebar active={pathname.replace(/\/$/, '')} effectiveRole={slug} permissions={user?.permissions} />
    <div className={styling("main-column")}>
      <Navbar user={user} searchQuery={searchQuery} onSearchChange={onSearchChange} />
      <main className={styling("page-body")}>{children}</main>
    </div>
  </div>
}
