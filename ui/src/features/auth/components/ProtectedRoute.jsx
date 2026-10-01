import { Navigate, useLocation } from 'react-router-dom'
import useSession from '../hooks/useSession.js'
import { getRoleDashboard, roleSlug } from '../utils/roles.js'

export default function ProtectedRoute({ children, allowedRoles, requiredPermission }) {
  const { status, user } = useSession()
  const location = useLocation()
  if (status === 'loading' || status === 'unavailable') return <div role="status" className="auth-status">{status === 'loading' ? 'Verifying access...' : 'Unable to verify your session. Refresh to try again.'}</div>
  if (status === 'unauthenticated') return <Navigate to="/login" state={{ from: location.pathname }} replace />

  const home = getRoleDashboard(user.role)
  const role = roleSlug(user.role)
  const wrongDashboard = ['/admin/dashboard', '/pm/dashboard', '/user/dashboard'].includes(location.pathname) && location.pathname !== home
  const forbidden = !role || wrongDashboard ||
    (allowedRoles?.length && !allowedRoles.some((allowed) => roleSlug(allowed) === role)) ||
    (requiredPermission && user.permissions?.[requiredPermission.module]?.[requiredPermission.action] !== true)

  if (forbidden) {
    return home === location.pathname ? <div role="alert">Access denied.</div> : <Navigate to={home} replace />
  }
  return typeof children === 'function' ? children(user) : children
}
