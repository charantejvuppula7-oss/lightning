import { Suspense, useState } from 'react'
import { Outlet, useLocation, useOutletContext } from 'react-router-dom'
import ProtectedRoute from '../app/routes/RouteGuard.jsx'
import { roleSlug } from '../shared/utils/roles.js'
import Sidebar from './Sidebar.jsx'
import Navbar from './Navbar.jsx'

export default function Loading({ user, children }) {
  const { pathname } = useLocation()
  const effectiveRole = roleSlug(user?.role)

  return (
    <div className="min-h-dvh! flex! [background:var(--color-slate-50)]! [color:var(--color-slate-900)]!">
      <Sidebar active={pathname.replace(/\/$/, '')} effectiveRole={effectiveRole} permissions={user?.permissions} canAccessChat={user?.can_access_chat} />
      <div className="min-w-0! flex-1!">
        <Suspense fallback={<p role="status" className="p-6">Loading...</p>}>
          {children}
        </Suspense>
      </div>
    </div>
  )
}

export function PersistentSidebarRoute() {
  const [searchQuery, setSearchQuery] = useState('')
  const onSearchChange = (event) => setSearchQuery(event.target.value)

  return (
    <ProtectedRoute>
      {(user) => <Loading user={user}><Outlet context={{ searchQuery, onSearchChange, persistentSidebar: true }} /></Loading>}
    </ProtectedRoute>
  )
}

export function AppLayout({ user, children, searchQuery, onSearchChange, navbarProps }) {
  const { pathname } = useLocation()
  const outletContext = useOutletContext() || {}
  const resolvedSearchQuery = searchQuery ?? outletContext.searchQuery
  const resolvedOnSearchChange = onSearchChange ?? outletContext.onSearchChange
  const effectiveRole = user ? roleSlug(user.role) : pathname.startsWith('/admin/') ? 'admin' : pathname.startsWith('/pm/') ? 'pm' : 'user'
  const sidebarIsPersistent = outletContext.persistentSidebar === true

  return (
    <div className="min-h-dvh! flex! [background:var(--color-slate-50)]! [color:var(--color-slate-900)]!">
      {!sidebarIsPersistent && <Sidebar active={pathname.replace(/\/$/, '')} effectiveRole={effectiveRole} permissions={user?.permissions} canAccessChat={user?.can_access_chat} />}
      <div className="min-w-0! flex-1! flex! flex-col!">
        <Navbar user={user} searchQuery={resolvedSearchQuery} onSearchChange={resolvedOnSearchChange} {...navbarProps} />
        <main className="min-w-0! flex-1!">{children}</main>
      </div>
    </div>
  )
}

export function MonitoringLayout({ user, children }) {
  const { pathname } = useLocation()
  const outletContext = useOutletContext() || {}
  const sidebarIsPersistent = outletContext.persistentSidebar === true

  return (
    <div className="flex! min-h-screen! [background:var(--color-slate-50)]!">
      {!sidebarIsPersistent && <Sidebar active={pathname} effectiveRole={roleSlug(user.role)} permissions={user.permissions} canAccessChat={user.can_access_chat} />}
      {children}
    </div>
  )
}
