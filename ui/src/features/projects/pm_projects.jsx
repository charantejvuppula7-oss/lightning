import { Fragment, useMemo, useState } from 'react'
import './pm_projects.css'

const projects = [
  { name: 'Lightning', milestone: 'M2- Design Login Page', status: 'On going', due: '24-09-26', dependencies: 5, blockers: 1 },
  { name: 'Helix', milestone: 'M2- Design Login Page', status: 'Paused', due: '24-09-26', dependencies: 5, blockers: 1 },
  { name: 'Lightning', milestone: 'M2- Design Login Page', status: 'Upcoming', due: '24-09-26', dependencies: 5, blockers: 1 },
  { name: 'Lightning', milestone: 'M2- Design Login Page', status: 'On going', due: '24-09-26', dependencies: 5, blockers: 1 },
]

const tasks = [
  { feature: 'Feature 1', task: 'Task 1', milestone: 'PCB revision', assignee: 'sysadmin', due: '21 Sep 2026', priority: 'Low' },
  { feature: 'Feature 1', task: 'Task 2', milestone: 'Driver update', assignee: 'yogitamehra', due: '5 Sep 2026', priority: 'High' },
  { feature: 'Feature 1', task: 'Task 3', milestone: 'API integration', assignee: 'yogitamehra', due: '8 Sep 2026', priority: 'Medium' },
  { feature: 'Feature 2', task: 'Task 1', milestone: 'PCB revision', assignee: 'sysadmin', due: '21 Sep 2026', priority: 'Low' },
  { feature: 'Feature 2', task: 'Task 2', milestone: 'Driver update', assignee: 'yogitamehra', due: '5 Sep 2026', priority: 'High' },
]

function ProjectJourney() {
  return <section className="pm-project-journey">
    <h2>Project journey</h2>
    <div className="pm-journey-track"><span className="pm-track-complete" /><i className="journey-marker first" /><i className="journey-marker second" /><i className="journey-marker" /><i className="journey-marker" /><i className="journey-marker" /></div>
    <div className="pm-journey-labels">{['M1: Core Platform Upgrade', 'M2: Core Platform Upgrade', 'M3: Core Platform Upgrade', 'M4: Core Platform Upgrade', 'M5: Core Platform Upgrade'].map(item => <span key={item}>{item}</span>)}</div>
  </section>
}

function ProjectsOverview() {
  const [selected, setSelected] = useState(1)
  const project = projects[selected]
  return <>
    <div className="pm-projects-heading"><h1>Projects</h1><button type="button">＋ Create Project</button></div>
    <div className="pm-project-cards">{projects.map((item, index) => <button key={`${item.name}-${index}`} type="button" className={`pm-project-card${selected === index ? ' selected' : ''}`} onClick={() => setSelected(index)}>
      <div className="pm-project-card-top"><strong>{item.name}</strong><span className={`project-state ${item.status.toLowerCase().replace(' ', '-')}`}>{item.status}</span></div>
      <p>{item.milestone}</p><div className="project-percent">70%</div><div className="project-progress"><i /></div>
      <p className="project-due">Due: {item.due}</p><div className="project-counts"><span>♧ {item.dependencies} dependency</span><span>⊘ {item.blockers} blocker</span></div>
    </button>)}</div>
    <section className="pm-overview-card"><div className="pm-overview-head"><div><h2>Project Overview</h2><h3>{project.name}</h3><div className="project-meta"><span>AP422</span><b>● Delayed</b><span>Acme</span></div></div><div className="pm-overview-actions"><button>Assign Task</button><button>Edit project</button><button aria-label="More project options">⋮</button></div></div><ProjectJourney /></section>
  </>
}

function ProjectDetails() {
  const details = [['Project manager', 'Yogita mehra'], ['Planned window', '21 Aug – 27 Aug 2026'], ['Current Milestone', 'Design PM dashboard'], ['Client', 'Acme'], ['Blockers', '2'], ['Dependencies', '6']]
  return <section className="pm-details-card"><h2>Project Details</h2><div>{details.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div></section>
}

function TeamMembers() {
  return <section className="pm-team"><h2>Team Member</h2><div>{Array.from({ length: 6 }, (_, index) => <article key={index}><i /><span className={`presence presence-${index}`} /><strong>Yogita Mehra</strong><small>UI/UX Designer</small><small>5 tasks</small></article>)}</div></section>
}

function ProjectTasks() {
  const [query, setQuery] = useState('')
  const [milestone, setMilestone] = useState('')
  const [assignee, setAssignee] = useState('')
  const [priority, setPriority] = useState('')
  const filtered = useMemo(() => tasks.filter(row =>
    (!query || `${row.feature} ${row.task} ${row.milestone} ${row.assignee}`.toLowerCase().includes(query.toLowerCase())) &&
    (!milestone || row.milestone === milestone) && (!assignee || row.assignee === assignee) && (!priority || row.priority === priority)), [query, milestone, assignee, priority])
  const clearFilters = () => { setQuery(''); setMilestone(''); setAssignee(''); setPriority('') }
  return <section className="pm-tasks-section"><h2>Tasks</h2><div className="pm-task-table-wrap"><div className="pm-task-filters"><input aria-label="Search tasks" placeholder="⌕  Search tasks" value={query} onChange={event => setQuery(event.target.value)} />
    <select aria-label="Filter by milestone" value={milestone} onChange={event => setMilestone(event.target.value)}><option value="">Milestone</option>{[...new Set(tasks.map(row => row.milestone))].map(value => <option key={value}>{value}</option>)}</select>
    <select aria-label="Filter by assignee" value={assignee} onChange={event => setAssignee(event.target.value)}><option value="">Anyone</option>{[...new Set(tasks.map(row => row.assignee))].map(value => <option key={value}>{value}</option>)}</select>
    <select aria-label="Filter by priority" value={priority} onChange={event => setPriority(event.target.value)}><option value="">Any priority</option>{['Low', 'Medium', 'High'].map(value => <option key={value}>{value}</option>)}</select>
    <button className="pm-clear-filters" onClick={clearFilters}>Clear</button></div>
    <table><thead><tr>{['Feature', 'Milestone', 'Assigned to', 'Due Date', 'Priority'].map(item => <th key={item}>{item}</th>)}</tr></thead><tbody>
      {filtered.map((row, index) => <Fragment key={`${row.feature}-${row.task}`}>
        {(index === 0 || filtered[index - 1].feature !== row.feature) && <tr className="feature-group" key={`${row.feature}-header-${index}`}><td colSpan="5">{row.feature}</td></tr>}
        <tr className="project-task"><td>{row.task}</td><td>{row.milestone}</td><td>{row.assignee}</td><td>{row.due}</td><td><span className={`priority ${row.priority.toLowerCase()}`}>{row.priority}</span></td></tr>
      </Fragment>)}</tbody></table>
  </div></section>
}

export default function PmProjects() {
  return <main className="pm-projects-page"><ProjectsOverview /><ProjectDetails /><TeamMembers /><ProjectTasks /></main>
}
