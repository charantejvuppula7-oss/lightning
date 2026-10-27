import { useLocation } from 'react-router-dom'
import { roleSlug } from '../shared/utils/roles.js'
import Sidebar from './Sidebar.jsx'
import Navbar from './Navbar.jsx'

export default function AppLayout({ user, children, searchQuery, onSearchChange, navbarProps }) {
  const { pathname } = useLocation()
  const effectiveRole = user ? roleSlug(user.role) : pathname.startsWith('/admin/') ? 'admin' : pathname.startsWith('/pm/') ? 'pm' : 'user'

  return (
    <div className="min-h-dvh! flex! [background:var(--color-slate-50)]! [color:var(--color-slate-900)]!">
      <Sidebar active={pathname.replace(/\/$/, '')} effectiveRole={effectiveRole} permissions={user?.permissions} canAccessChat={user?.can_access_chat} />
      <div className="min-w-0! flex-1! flex! flex-col!">
        <Navbar user={user} searchQuery={searchQuery} onSearchChange={onSearchChange} {...navbarProps} />
        <main className="min-w-0! flex-1!">{children}</main>
      </div>
    </div>
  )
}
