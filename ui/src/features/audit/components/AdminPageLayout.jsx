import { useLocation } from 'react-router-dom'
import './monitoring.css'
import Sidebar from '../../../layouts/Sidebar.jsx'
import { roleSlug } from '../../../utils/roles.js'
export default function AdminPageLayout({ user, children }) {
 const { pathname } = useLocation()
 return <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-slate-50)' }}>
   <Sidebar active={pathname} effectiveRole={roleSlug(user.role)} permissions={user.permissions} canAccessChat={user.can_access_chat} />
   {children}
 </div>
}
