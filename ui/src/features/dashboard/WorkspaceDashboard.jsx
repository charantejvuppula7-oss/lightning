import { useState } from 'react'
import { Link } from 'react-router-dom'
import useApiData from '../../shared/hooks/useApiData.js'
import { useProjectSelection } from '../projects/useProjectSelection.js'
import ProjectJourneyCard from '../projects/ProjectJourneyCard.jsx'
import { hasSidebarPermission } from '../../layouts/Sidebar.jsx'
import totalTasksIcon from '../../assets/total_tasks.png'
import inProgressIcon from '../../assets/in_progress.png'
import dueTodayIcon from '../../assets/due_today.png'

const date = value => value ? new Date(value).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : 'Not scheduled'
const initials = name => name ? name.split(/\s+/).map(word => word[0]).slice(0,2).join('').toUpperCase() : '\u2014'
const progress = tasks => tasks.length ? Math.round(100*tasks.filter(task => task.status === 'completed').length/tasks.length) : 0

function TaskGroup({ group, tasks, expanded, onToggle }) {
  const percent = progress(tasks)
  const byFeature = new Map()
  for (const task of tasks) {
    const rows = byFeature.get(task.feature) || []
    rows.push(task); byFeature.set(task.feature,rows)
  }
  const features = [...group.features,...(byFeature.has(null) ? [{id:null,name:'No feature'}] : [])]
  return <article className="workspace-milestone">
    <button className="workspace-milestone-heading" onClick={onToggle} aria-expanded={expanded}>
      <span className="material-symbols-outlined">{expanded ? 'expand_more' : 'chevron_right'}</span>
      <span className="workspace-group-title"><span className="flex items-center gap-[8px]"><strong>{group.name}</strong><span className={`workspace-badge ${percent === 100 ? 'complete' : ''}`}>{percent === 100 ? 'Complete' : percent > 0 ? 'In Progress' : 'Upcoming'}</span></span><small>Due {date(group.due_date)}</small></span>
      <span className="workspace-meter"><i style={{width:`${percent}%`}} /></span><span>{percent}% · {tasks.filter(task => task.status === 'completed').length}/{tasks.length}</span>
    </button>
    {expanded && <div className="workspace-features">{features.filter(feature => byFeature.has(feature.id)).map(feature => {
      const rows = byFeature.get(feature.id)
      return <details key={feature.id || 'none'} open><summary><strong>{feature.name}</strong><span>{progress(rows)}% · {rows.filter(task => task.status === 'completed').length}/{rows.length}</span></summary>
        {rows.map(task => <div className="workspace-task" key={task.id}><span>•</span><Link to={`/user/tasks?taskId=${task.id}`}>{task.name}</Link><span title={task.assignee_name} className="workspace-initials">{initials(task.assignee_name)}</span><span title={task.reviewer_name || 'No reviewer'} className="workspace-initials">{initials(task.reviewer_name)}</span><time>{date(task.due_date)}</time><span className="workspace-task-status">{task.status.replaceAll('_',' ')}</span></div>)}
      </details>
    })}{!tasks.length && <p className="workspace-empty">No tasks match this selection.</p>}</div>}
  </article>
}

function WorkspaceTasks({ project,tasks,user }) {
  const [expanded,setExpanded] = useState([])
  const [mine,setMine] = useState(false)
  const [query,setQuery] = useState('')
  const visible = tasks.filter(task => (!mine || String(task.assigned_to) === String(user.id)) && `${task.name} ${task.description} ${task.assignee_name}`.toLowerCase().includes(query.toLowerCase()))
  const byMilestone = new Map()
  for (const task of visible) {
    const rows = byMilestone.get(task.milestone) || []
    rows.push(task); byMilestone.set(task.milestone,rows)
  }
  const groups = [...project.milestones,...(byMilestone.has(null) ? [{id:null,name:'No milestone',features:[]}] : [])]
  return <section><div className="workspace-toolbar"><label><span className="material-symbols-outlined">search</span><input aria-label="Search workspace tasks" placeholder="Search tasks, docs, people...." value={query} onChange={event => setQuery(event.target.value)} /></label>
    <button className={!mine ? 'selected' : ''} onClick={() => setMine(false)}>All work</button><button className={mine ? 'selected' : ''} onClick={() => setMine(true)}>My Work</button><button onClick={() => setExpanded([])}>Collapse All</button><button onClick={() => setExpanded(groups.map(group => group.id))}>Expand All</button><span>{visible.length} tasks across {groups.filter(group => byMilestone.has(group.id)).length} milestones</span></div>
    <div className="workspace-milestones">{groups.filter(group => !query || byMilestone.has(group.id)).map(group => <TaskGroup key={group.id || 'none'} group={group} tasks={byMilestone.get(group.id) || []} expanded={expanded.includes(group.id)} onToggle={() => setExpanded(previous => previous.includes(group.id) ? previous.filter(id => id !== group.id) : [...previous,group.id])} />)}{!visible.length && <p className="workspace-empty">No tasks match this selection.</p>}</div>
  </section>
}

export default function WorkspaceDashboard({ user }) {
  const {selectedProjectId} = useProjectSelection()
  const {data,loading,error,reload} = useApiData(selectedProjectId && selectedProjectId !== 'all' ? `/workspace/?project=${selectedProjectId}` : null,null)
  const showTasks = hasSidebarPermission(user.permissions || {},'Tasks','View')
  return <main className="user-workspace"><header><h1>Workspace</h1><p>Access project journey and your today's task</p></header>
    {error && <p role="alert">{error} <button onClick={reload}>Retry</button></p>}
    {!selectedProjectId || selectedProjectId === 'all' ? <p>Select a project to view your workspace.</p> : loading ? <p role="status">Loading workspace...</p> : data && <>
      {hasSidebarPermission(user.permissions || {},'ProjectJourney','View') && <section><h2>Project Journey</h2><ProjectJourneyCard project={data.project} /></section>}
      {showTasks && <><div className="workspace-metrics-panel"><div className="workspace-metrics">{[[totalTasksIcon,'Total Tasks',data.stats.tasks],[inProgressIcon,'In progress',data.tasks.filter(task => task.status === 'in_progress').length],[null,'Blockers',data.stats.blockers],[dueTodayIcon,'Due today',data.stats.due_today]].map(([icon,label,count]) => <article key={label}>{icon ? <img src={icon} alt=""/> : <span className="material-symbols-outlined inline-flex! h-[40px] w-[40px] items-center justify-center rounded-[8px] bg-[#9bbfff] text-[#1e4788]">block</span>}<div><strong>{label}</strong><b className={label === 'Due today' ? 'due' : ''}>{count}</b></div></article>)}</div></div><WorkspaceTasks key={data.project.id} project={data.project} tasks={data.tasks} user={user} /></>}
      {hasSidebarPermission(user.permissions || {}, 'recentActvities') && <section><h2>Recent Activities</h2><div className="workspace-activities">{data.activities.length ? data.activities.slice(0,5).map(activity => <article key={activity.id}><span className="material-symbols-outlined">history</span><strong>{activity.actor} {activity.action}<small>{activity.name}</small></strong><time>{date(activity.timestamp)}</time></article>) : <p className="workspace-empty">No recent activity recorded for this project.</p>}</div></section>}
    </>}
  </main>
}
