import { useLocation } from 'react-router-dom'
import { roleSlug } from '../utils/roles.js'
import Navbar from './Navbar.jsx'
import Sidebar from './Sidebar.jsx'

export default function PageLayout({ user, children, searchQuery, onSearchChange }) {
  const { pathname } = useLocation()
  const slug = user ? roleSlug(user.role) : pathname.startsWith('/admin/') ? 'admin' : pathname.startsWith('/pm/') ? 'pm' : 'user'
  const role = slug === 'admin' || slug === 'pm' ? slug : 'user'

  return <div className="app-shell">
    <Sidebar active={pathname.replace(/\/$/, '')} effectiveRole={role} />
    <div className="main-column">
      <Navbar user={user} searchQuery={searchQuery} onSearchChange={onSearchChange} />
      <main className="page-body">{children}</main>
    </div>
  </div>
}
