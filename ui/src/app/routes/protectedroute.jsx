import { Navigate, useLocation } from 'react-router-dom'
import useSession from '../hooks/useSession.js'
import { getRoleDashboard, roleSlug } from '../../utils/roles.js'
import { hasSidebarPermission } from '../../layouts/sidebarNavigation.js'
import LayoutSkeleton from '../../layouts/LayoutSkeleton.jsx'

export default function ProtectedRoute({ children, allowedRoles, requiredPermission }) {
  const { status, user } = useSession()
  const location = useLocation()
  if (status === 'loading') return <LayoutSkeleton pathname={location.pathname} />
  if (status === 'unavailable') return <div role="status" className="auth-status">Unable to verify your session. Refresh to try again.</div>
  if (status === 'unauthenticated') return <Navigate to="/login" state={{ from: location.pathname }} replace />

  const home = getRoleDashboard(user.role)
  const role = roleSlug(user.role)
  const modules = [requiredPermission?.module].flat().filter(Boolean)
  const permitted = modules.some(module => module === 'Chat'
    ? user.can_access_chat || hasSidebarPermission(user.permissions || {}, 'Projects', 'View')
    : hasSidebarPermission(user.permissions || {}, module, requiredPermission.action))
  const wrongDashboard = ['/admin/dashboard', '/pm/dashboard', '/user/dashboard'].includes(location.pathname) && location.pathname !== home
  const forbidden = !role || wrongDashboard ||
    (allowedRoles?.length && !allowedRoles.some((allowed) => roleSlug(allowed) === role)) ||
    (requiredPermission && role !== 'admin' && !permitted)

  if (forbidden) {
    return home === location.pathname ? <div role="alert">Access denied.</div> : <Navigate to={home} replace />
  }
  return typeof children === 'function' ? children(user) : children
}
