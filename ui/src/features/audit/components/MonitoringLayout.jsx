import { useLocation } from 'react-router-dom'
import Sidebar from '../../../layouts/Sidebar.jsx'
import { roleSlug } from '../../../shared/utils/roles.js'
export default function MonitoringLayout({ user, children }) {
 const { pathname } = useLocation()
 return <div className="flex! min-h-screen! [background:var(--color-slate-50)]!">
   <Sidebar active={pathname} effectiveRole={roleSlug(user.role)} permissions={user.permissions} canAccessChat={user.can_access_chat} />
   {children}
 </div>
}
