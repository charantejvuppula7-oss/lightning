import { Navigate, useLocation, useOutletContext } from 'react-router-dom'
import useSession from '../../shared/hooks/useSession.js'
import { getRoleDashboard, roleSlug } from '../../shared/utils/roles.js'
import { hasSidebarPermission } from '../../layouts/Sidebar.jsx'
import LayoutSkeleton from '../../layouts/LayoutSkeleton.jsx'

export default function ProtectedRoute({ children, allowedRoles, requiredPermission }) {
  const parentUser = useOutletContext()?.user
  const { status, user } = useSession(parentUser)
  const location = useLocation()
  if (status === 'loading') return <LayoutSkeleton pathname={location.pathname} />
  if (status === 'unavailable') return <div role="status" className="auth-status">Unable to verify your session. Refresh to try again.</div>
  if (status === 'unauthenticated') return <Navigate to="/login" state={{ from: location.pathname }} replace />

  const home = getRoleDashboard(user.role)
  const role = roleSlug(user.role)
  const modules = [requiredPermission?.module].flat().filter(Boolean)
  const permitted = modules.some(module => hasSidebarPermission(user.permissions || {}, module, requiredPermission.action))
  const wrongDashboard = ['/admin/dashboard', '/pm/dashboard', '/user/dashboard'].includes(location.pathname) && location.pathname !== home
  const forbidden = !role || wrongDashboard ||
    (allowedRoles?.length && !allowedRoles.some((allowed) => roleSlug(allowed) === role)) ||
    (requiredPermission && role !== 'admin' && !permitted)

  if (forbidden) {
    return home === location.pathname ? <div role="alert">Access denied.</div> : <Navigate to={home} replace />
  }
  return typeof children === 'function' ? children(user) : children
}
