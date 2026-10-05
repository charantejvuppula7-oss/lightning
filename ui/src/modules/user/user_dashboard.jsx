import { useState } from 'react'
import totalTasksIcon from '../../assets/total_tasks.png'
import dependencyIcon from '../../assets/in_progress.png'
import dueTodayIcon from '../../assets/due_today.png'
import './user_dashboard.css'

const milestones = [
  { id: 'M1', name: 'Requirements', status: 'Complete', progress: 100, features: '3 of 3 features complete', tasks: ['Task 1 - Add authentication module', 'Task 1 - Add authentication module'] },
  { id: 'M2', name: 'Requirements', status: 'Active', progress: 60, features: '3 of 3 features complete', tasks: ['Task 2 - Build project workspace', 'Task 3 - Connect data API'] },
  { id: 'M3', name: 'Requirements', status: 'Active', progress: 60, features: '3 of 3 features complete', tasks: ['Task 4 - Validate release workflow'] },
]

function ProjectJourney() {
  return <section className="user-journey">
    <h2>Project Journey</h2>
    <div className="journey-card">
      <div className="journey-project"><div><strong>Project Alpha</strong><span>M1: Core Platform Upgrade</span></div><div className="journey-progress"><b>65%</b><span>Aug 1 - Aug 31</span></div></div>
      <div className="journey-track"><div className="journey-done" /><span className="journey-point start" /><span className="journey-point current" /><span className="pause-point">Ⅱ</span><span className="journey-point" /><span className="journey-point" /><span className="journey-point" /></div>
      <div className="journey-labels">{['M1: Core Platform Upgrade', 'M2: Core Platform Upgrade', 'M3: Core Platform Upgrade', 'M4: Core Platform Upgrade', 'M5: Core Platform Upgrade'].map(label => <span key={label}>{label}</span>)}</div>
      <aside className="pause-card"><strong>🟡 Paused</strong><small>Mar 06 – Mar 10</small><b>Reason</b><span>Waiting for data API from backend team</span></aside>
    </div>
  </section>
}

function SummaryCards() {
  return <div className="user-summary">{[
    [totalTasksIcon, 'Total Tasks', '2'], [dependencyIcon, 'Dependency', '2'], [dueTodayIcon, 'Blockers', '2'], [dueTodayIcon, 'Due today', '2'],
  ].map(([icon, title, count]) => <article className="summary-tile" key={title}><img className="summary-icon" src={icon} alt="" /><div><strong>{title}</strong><b className={title === 'Due today' ? 'due-count' : ''}>{count}</b></div></article>)}</div>
}

function Milestone({ milestone, expanded, onToggle }) {
  const complete = milestone.progress === 100
  return <article className="milestone-card">
    <button className={`milestone-heading${complete ? ' complete' : ''}`} onClick={onToggle} aria-expanded={expanded}>
      <span className="milestone-chevron">{expanded ? '⌄' : '›'}</span>
      <span className="milestone-name"><strong>{milestone.id} · {milestone.name}</strong><small>15 Jun – 18 Aug · {milestone.features}</small></span>
      <span className={`milestone-status ${complete ? 'done' : ''}`}>{milestone.status}</span>
      <span className="milestone-meter"><i style={{ width: `${milestone.progress}%` }} className={complete ? 'green' : ''} /></span>
      <span className="milestone-percentage">{milestone.progress}% · 5/5</span>
    </button>
    {expanded && <div className="milestone-details"><div className="feature-row"><span className="milestone-chevron">⌄</span><span><strong>F1 · Requirement capture</strong><small>15 Jun – 18 Aug · 3 of 3 features complete</small></span><span className="milestone-meter"><i style={{ width: `${milestone.progress}%` }} className={complete ? 'green' : ''} /></span><span className="milestone-percentage">{milestone.progress === 100 ? '100%' : `${milestone.progress}%`} · 2/2</span></div>
      {complete && milestone.tasks.map((task, index) => <div className="user-task-row" key={`${task}-${index}`}><span>•</span><strong>{task}</strong><span className="task-initials">DK</span><span className="task-initials">DK</span><time>8 Jun</time><span className="task-done">Done</span></div>)}
    </div>}
  </article>
}

function Tasks() {
  const [expanded, setExpanded] = useState(['M1', 'M2'])
  const [mineOnly, setMineOnly] = useState(false)
  const [query, setQuery] = useState('')
  const visible = milestones.filter(item => `${item.id} ${item.name} ${item.tasks.join(' ')}`.toLowerCase().includes(query.toLowerCase()))
  const toggle = id => setExpanded(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  const setAll = open => setExpanded(open ? milestones.map(item => item.id) : [])
  return <section className="user-tasks"><h2>Tasks</h2><div className="task-toolbar"><label className="task-search"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search tasks, docs, people...." /></label><button className={!mineOnly ? 'selected' : ''} onClick={() => setMineOnly(false)}>All work</button><button className={mineOnly ? 'selected' : ''} onClick={() => setMineOnly(true)}>My Work</button><button onClick={() => setAll(false)}>Collapse All</button><button onClick={() => setAll(true)}>Expand All</button><span className="task-count">38 tasks across 5 milestones</span></div>
    <div className="milestone-list">{visible.map(milestone => <Milestone key={milestone.id} milestone={milestone} expanded={expanded.includes(milestone.id)} onToggle={() => toggle(milestone.id)} />)}</div>
  </section>
}

function RecentActivities() {
  return <section className="recent-activities"><h2>Recent Activities</h2><div className="activity-list">
    <article><span className="activity-icon">✓</span><div><strong>Alex Mercer completed task</strong></div><time>4h ago</time></article>
    <article><span className="activity-icon">⇧</span><div><strong>David Kim uploaded a file</strong><span className="file-chip"><b>PDF</b> architecture-diagram.pdf</span></div><time>Oct 24</time></article>
  </div></section>
}

export default function UserDashboard() {
  return <main className="user-dashboard"><header className="workspace-heading"><h1>Workspace</h1><p>Access project journey and your today’s task</p></header><ProjectJourney /><SummaryCards /><Tasks /><RecentActivities /></main>
}
