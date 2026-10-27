import { SidebarLayout } from '../../../layouts/Sidebar.jsx'
import GlobalSearch from '../../../components/common/GlobalSearch.jsx'
import { roleSlug } from '../../../utils/roles.js'
import ProjectEditorPage from './ProjectEditorPage.jsx'

export default function ProjectEditorLayout({ user }) {
  return <SidebarLayout user={user} navbarProps={{
    leftContent: <GlobalSearch style={{ width: '280px', maxWidth: '100%' }} />,
    showProjectSelector: false,
    showSearch: false,
    beforeAvatar: <span className="material-symbols-outlined" title="Help" style={{ fontSize: 20, color: 'var(--color-slate-500)' }}>help</span>,
    avatarColor: roleSlug(user?.role) === 'admin' ? 'var(--color-primary)' : 'var(--color-role-pm)',
    avatarStyle: { boxShadow: 'none' },
    rightStyle: { gap: 16 },
    style: { height: 64, minHeight: 64, maxHeight: 64, padding: '0 32px' },
  }}><ProjectEditorPage user={user} /></SidebarLayout>
}
