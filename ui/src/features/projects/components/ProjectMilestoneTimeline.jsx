import { useState } from 'react'
import ProjectJourneyStatusCard from './ProjectJourneyStatusCard.jsx'

const shortDate = value => value ? new Date(`${value.slice(0,10)}T00:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : 'Not scheduled'

export default function ProjectMilestoneTimeline({ project, compact = true }) {
  const [hover,setHover] = useState(null)
  const milestones = [...(project?.milestones || [])].sort((a,b) => (a.due_date || '').localeCompare(b.due_date || '') || a.name.localeCompare(b.name))
  if (!milestones.length) return <p className="[color:#727272]! text-[13px]!">No milestones scheduled.</p>
  const position = index => milestones.length === 1 ? 0 : index*100/(milestones.length-1)
  const presentation = milestone => {
    const completed = milestone.task_count > 0 && milestone.progress === 100
    const overdue = !completed && milestone.due_date && milestone.due_date < new Date().toLocaleDateString('en-CA')
    const color = completed ? '#16A34A' : overdue ? '#DC2626' : milestone.progress > 0 ? '#2563EB' : '#94A3B8'
    return {color,data:{type:completed ? 'completed' : overdue ? 'blocked' : 'in_progress',
      badgeLabel:completed ? 'Completed' : overdue ? 'Overdue' : milestone.progress > 0 ? 'In progress' : 'Upcoming',
      badgeBg:'#F8FAFC',badgeColor:color,badgeBorder:color,borderColor:color,dotColor:color,
      title:milestone.name,date:`${shortDate(milestone.start_date)} – ${shortDate(milestone.due_date)}`,
      whatHappened:`${milestone.completed || 0} of ${milestone.task_count || 0} tasks completed.${milestone.description ? ` ${milestone.description}` : ''}`}}
  }
  return <div className="relative! p-[14px_10px_0]! mb-[12px]!">
    <div className="relative! [background:#D9D9D9]! rounded-[4px]!" style={{
  height: compact ? 5 : 9
}}>
      <div className="absolute! h-full! [background:#1157CE]! rounded-[4px]!" style={{
  width: `${project.progress || 0}%`
}} />
      {milestones.map((milestone,index) => <button key={milestone.id} type="button" aria-label={`${milestone.name}: ${milestone.progress || 0}% completed`}
        onMouseEnter={() => setHover(milestone.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(milestone.id)} onBlur={() => setHover(null)}
        className="absolute! top-[50%]! [transform:translate(-50%,-50%)]! [border:2px_solid_white]! rounded-[50%]! cursor-pointer!" style={{
  left: `${position(index)}%`,
  width: compact ? 18 : 28,
  height: compact ? 18 : 28,
  background: presentation(milestone).color
}} />)}
    </div>
    <div className="relative! h-[44px]! mt-[14px]!">{milestones.map((milestone,index) => <div key={milestone.id} className="absolute! max-w-[140px]! text-center! [color:#727272]!" style={{
  left: `${position(index)}%`,
  transform: index === 0 ? 'translateX(-10%)' : index === milestones.length - 1 ? 'translateX(-90%)' : 'translateX(-50%)',
  fontSize: compact ? 11 : 13
}}>{`M${index+1}: ${milestone.name}`}</div>)}</div>
    {hover && milestones.some(item => item.id === hover) && <ProjectJourneyStatusCard cardData={presentation(milestones.find(item => item.id === hover)).data} positionPct={position(milestones.findIndex(item => item.id === hover))} />}
  </div>
}
