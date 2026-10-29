import { useState } from 'react'
import ProjectJourneyStatusCard from './ProjectJourneyStatusCard.jsx'

const shortDate = value => value ? new Date(`${value.slice(0,10)}T00:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : 'Not scheduled'

export default function ProjectMilestoneTimeline({ project }) {
  const [hover,setHover] = useState(null)
  const milestones = [...(project?.milestones || [])].sort((a,b) => (a.due_date || '').localeCompare(b.due_date || '') || a.name.localeCompare(b.name))
  if (!milestones.length) return <p className="[color:#727272]! text-[13px]!">No milestones scheduled.</p>
  const position = index => milestones.length === 1 ? 0 : index*100/(milestones.length-1)
  const presentation = milestone => {
    const completed = milestone.task_count > 0 && milestone.progress === 100
    const overdue = !completed && milestone.due_date && milestone.due_date < new Date().toLocaleDateString('en-CA')
    const color = completed ? '#04AB47' : overdue ? '#DC2626' : milestone.progress > 0 ? '#1157CE' : '#D9D9D9'
    return {completed,color,data:{type:completed ? 'completed' : overdue ? 'blocked' : 'in_progress',
      badgeLabel:completed ? 'Completed' : overdue ? 'Overdue' : milestone.progress > 0 ? 'In progress' : 'Upcoming',
      badgeBg:'#F8FAFC',badgeColor:color,badgeBorder:color,borderColor:color,dotColor:color,
      title:milestone.name,date:`${shortDate(milestone.start_date)} – ${shortDate(milestone.due_date)}`,
      whatHappened:`${milestone.completed || 0} of ${milestone.task_count || 0} tasks completed.${milestone.description ? ` ${milestone.description}` : ''}`}}
  }
  return <div className="relative! w-full! px-[10px]! mt-[14px]! box-border!">
    <div className="relative! h-[5px]! [background:#D9D9D9]! rounded-[4px]!">
      <div className="absolute! h-full! [background:#1157CE]! rounded-[4px]!" style={{
  width: `${project.progress || 0}%`
}} />
      {milestones.map((milestone,index) => {
        const {completed,color} = presentation(milestone)
        const active = !completed && (milestone.progress > 0 || index === 0)
        return <button key={milestone.id} type="button" aria-label={`${milestone.name}: ${milestone.progress || 0}% completed`}
        onMouseEnter={() => setHover(milestone.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(milestone.id)} onBlur={() => setHover(null)}
        className="absolute! top-[50%]! [transform:translate(-50%,-50%)]! rounded-full! cursor-pointer! box-border! p-0!" style={{
  left: `${position(index)}%`,
  width: completed ? 22 : 18,
  height: completed ? 22 : 18,
  background: active && color === '#D9D9D9' ? '#1157CE' : color,
  border: completed ? '2.5px solid #006E2F' : active ? '2px solid white' : 'none',
  boxShadow: active ? `0 0 0 1.5px ${color === '#D9D9D9' ? '#1157CE' : color}` : 'none',
  zIndex: active || completed ? 10 : 5,
}} />})}
    </div>
    <div className="relative! h-[36px]! mt-[14px]!">{milestones.map((milestone,index) => <div key={milestone.id} className="absolute! max-w-[140px]! text-[11px]! font-medium! leading-[1.3]! [color:#727272]!" style={{
  left: `${position(index)}%`,
  transform: index === 0 ? 'none' : index === milestones.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)',
  textAlign: index === 0 ? 'left' : index === milestones.length - 1 ? 'right' : 'center',
}}>{`M${index+1}: ${milestone.name}`}</div>)}</div>
    {hover && milestones.some(item => item.id === hover) && <ProjectJourneyStatusCard cardData={presentation(milestones.find(item => item.id === hover)).data} positionPct={position(milestones.findIndex(item => item.id === hover))} />}
  </div>
}
