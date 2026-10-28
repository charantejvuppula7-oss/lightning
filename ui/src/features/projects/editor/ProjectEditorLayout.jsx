import { AppLayout } from '../../../layouts/Loading.jsx'
import GlobalSearch from '../../../shared/components/GlobalSearch.jsx'
import { roleSlug } from '../../../shared/utils/roles.js'
import ProjectEditorPage from './ProjectEditorPage.jsx'

export default function ProjectEditorLayout({ user }) {
  return <AppLayout user={user} navbarProps={{
    leftContent: <GlobalSearch className="w-[280px]! max-w-full" />,
    showProjectSelector: false,
    showSearch: false,
    beforeAvatar: <span className={"material-symbols-outlined" + " " + "text-[20px]! [color:var(--color-slate-500)]!"} title="Help" >help</span>,
    avatarColor: roleSlug(user?.role) === 'admin' ? 'var(--color-primary)' : 'var(--color-role-pm)',
    avatarClassName: 'shadow-none!',
    rightGap: 16,
    className: 'h-[64px]! min-h-[64px]! max-h-[64px]! px-[32px]!',
  }}><ProjectEditorPage user={user} /></AppLayout>
}
