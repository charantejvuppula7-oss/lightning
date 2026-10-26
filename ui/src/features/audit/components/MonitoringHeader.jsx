import Navbar from '../../../layouts/Navbar.jsx'
export default function MonitoringHeader({ user, title, subtitle, icon, actions, actionsGap = 12 }) {
 return <Navbar user={user} showSearch={false} avatarStyle={{ width: 34, height: 34, boxShadow: 'none' }} rightStyle={{ gap: actionsGap }} style={{ height: 60, minHeight: 60, maxHeight: 60, padding: '0 32px' }}
  leftContent={<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
   <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--color-primary-subtle)', display: 'grid', placeItems: 'center' }}><span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--color-primary)' }}>{icon}</span></div>
   <div><h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-slate-900)', margin: 0 }}>{title}</h1><span style={{ fontSize: 11, color: 'var(--color-slate-500)' }}>{subtitle}</span></div>
  </div>} actions={actions} />
}
