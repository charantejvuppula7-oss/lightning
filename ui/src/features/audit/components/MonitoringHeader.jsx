import Navbar from '../../../layouts/Navbar.jsx'
export default function MonitoringHeader({ user, title, subtitle, icon, actions, actionsGap = 12 }) {
 return <Navbar user={user} showSearch={false} avatarClassName="w-[34px]! h-[34px]! shadow-none!" rightGap={actionsGap} className="h-[60px]! min-h-[60px]! max-h-[60px]! px-[32px]!"
  leftContent={<div className="flex! items-center! gap-[12px]!">
   <div className="w-[36px]! h-[36px]! rounded-[8px]! [background:var(--color-primary-subtle)]! grid! [place-items:center]!"><span className={"material-symbols-outlined" + " " + "text-[20px]! [color:var(--color-primary)]!"} >{icon}</span></div>
   <div><h1 className="text-[17px]! font-bold! [color:var(--color-slate-900)]! m-0!">{title}</h1><span className="text-[11px]! [color:var(--color-slate-500)]!">{subtitle}</span></div>
  </div>} actions={actions} />
}
