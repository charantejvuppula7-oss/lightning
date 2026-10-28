import { Fragment, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import useApiData from '../../shared/hooks/useApiData.js'
import { useProjectSelection } from './useProjectSelection.js'
import { hasSidebarPermission } from '../../layouts/Sidebar.jsx'
import { apiList, apiRequest, errorMessage } from '../../shared/api/apiClient.js'
import { useFeedback } from '../../shared/components/Feedback.jsx'
import { roleSlug } from '../../shared/utils/roles.js'
import ProjectJourneyCard from './ProjectJourneyCard.jsx'
import CreateTaskDialog from '../tasks/CreateTaskDialog.jsx'
import AddFeatureModal from './AddFeatureModal.jsx'
import AddMilestoneModal from './AddMilestoneModal.jsx'
import { exportProjectToPdf } from './exportProjectToPdf.js'

const formatDate = value => value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export default function ProjectOverviewPage({ user }) {
  const navigate = useNavigate()
  const [dialog, setDialog] = useState(null)
  const [taskRevision, setTaskRevision] = useState(0)
  const [statusOverrides, setStatusOverrides] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pm_project_status_overrides') || '{}') } catch { return {} }
  })
  const location = useLocation()
  const { selectedProjectId, setSelectedProjectId, loadProjects } = useProjectSelection()
  const { data: projects, loading, error, reload } = useApiData('/projects/overview/', [])
  const { toast, feedback } = useFeedback()
  const role = roleSlug(user?.role)

  const allowed = action => role === 'admin' || hasSidebarPermission(user?.permissions || {}, 'Projects', action)
  const selected = projects.find(project => project.id === selectedProjectId) || projects[0]
  const project = selected && { ...selected, status: statusOverrides[selected.id] || selected.status }
  const select = project => {
    setSelectedProjectId(project.id)
    if (user?.id) localStorage.setItem(`company-project-selection-${user.id}`, project.id)
  }
  const assignTask = () => { select(project); setDialog('task') }
  const refresh = () => { reload(); setTaskRevision(value => value + 1) }
  const togglePause = () => {
    // Company keeps this presentation override in browser storage.
    const status = project.status === 'Paused' ? 'Ongoing' : 'Paused'
    const next = { ...statusOverrides, [project.id]: status }
    localStorage.setItem('pm_project_status_overrides', JSON.stringify(next))
    setStatusOverrides(next)
  }
  const exportProject = async () => {
    try {
      const tasks = await apiList(`/tasks/?project=${project.id}&page_size=100`)
      await exportProjectToPdf({ project: { ...project, Project_Name: project.project_name, Description: project.description }, tasks,
        teamMembers: project.members.map(person => ({ ...person, name: person.name, full_name: person.name })), projectStatusLabel: project.status, toast })
    } catch (error) { toast.error(errorMessage(error)) }
  }
  const remove = async () => {
    if (!window.confirm(`Delete ${project.project_name}? Only projects without dependent records can be deleted.`)) return
    try { await apiRequest(`/projects/${project.id}/`, { method: 'DELETE' }); await loadProjects(); reload(); toast.success('Project deleted.') }
    catch (error) { toast.error(errorMessage(error)) }
  }
  return <main className="pm-projects-page live-projects">
    <div className="pm-projects-heading"><div><h1>Projects</h1></div>{allowed('Create') && <button onClick={() => navigate('/projects/new')}>＋ Create Project</button>}</div>
    {feedback}{location.state?.saved && <p role="status">{location.state.saved}</p>}
    {error && <p role="alert">{error} <button onClick={reload}>Retry</button></p>}
    {loading ? <p role="status">Loading projects…</p> : <>
      <div className="pm-project-cards">{projects.map(item => <button type="button" key={item.id} className={project?.id === item.id ? 'pm-project-card selected' : 'pm-project-card'} aria-pressed={project?.id === item.id} onClick={() => select(item)}>
        <div className="pm-project-card-top"><strong title={item.project_name}>{item.project_name}</strong><span className={`project-state ${(statusOverrides[item.id] || item.status).toLowerCase()}`}>{statusOverrides[item.id] || item.status}</span></div>
        <p title={item.milestones[0]?.name}>{item.milestones[0] ? `M1- ${item.milestones[0].name}` : '—'}</p><div className="project-progress-row"><div className="project-progress"><i style={{ width: `${item.progress}%` }} /></div><span>{item.progress}%</span></div>
        <p className="project-due">Due: {formatDate(item.end_date)}</p><div className="project-counts"><span><span className="material-symbols-outlined">link</span>{item.dependency_count} dependency</span><span><span className="material-symbols-outlined">block</span>{item.blocker_count} blocker</span></div>
      </button>)}</div>
      {!projects.length && <p>No matching projects.</p>}
      {project ? <>
        {(role === 'admin' || hasSidebarPermission(user.permissions, 'ProjectJourney')) && <section><h2>Project Overview</h2><ProjectJourneyCard project={project}
          showTimeline={role === 'admin' || hasSidebarPermission(user.permissions, 'MilestoneMap')}
          onAddFeature={(role === 'admin' || hasSidebarPermission(user?.permissions || {}, 'Features', 'Create')) ? () => setDialog('feature') : undefined}
          onAddMilestone={(role === 'admin' || hasSidebarPermission(user?.permissions || {}, 'Milestones', 'Create')) ? () => setDialog('milestone') : undefined}
          onAssignTask={(role === 'admin' || hasSidebarPermission(user?.permissions || {}, 'Tasks', 'Create')) ? assignTask : undefined}
          onEditProject={allowed('Edit') ? () => navigate(`/projects/${project.id}/edit`) : undefined}
          onExportProject={exportProject}
          onPauseResume={allowed('Edit') ? togglePause : undefined} isProjectPaused={project.status === 'Paused'}
          onDeleteProject={allowed('Delete') ? remove : undefined}
        /></section>}
        {dialog === 'task' && <CreateTaskDialog key={project.id} project={project} projects={projects} onClose={() => setDialog(null)} onCreated={refresh} />}
        {dialog === 'feature' && <AddFeatureModal isOpen user={user} milestones={project.milestones} onClose={() => setDialog(null)} onCreated={refresh} />}
        {dialog === 'milestone' && <AddMilestoneModal isOpen user={user} projectId={project.id} onClose={() => setDialog(null)} onCreated={refresh} />}
        <section className="pm-details-card"><h2>Project Details</h2><div>{[
          ['Project manager', project.managers.map(person => person.name).join(', ')], ['Planned window', `${formatDate(project.start_date)} – ${formatDate(project.end_date)}`],
          ['Current Milestone', project.milestones[0]?.name || '—'], ['Client', project.customer || '—'], ['Blockers', project.blocker_count], ['Dependencies', project.dependency_count],
        ].map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div></section>
        {(role === 'admin' || hasSidebarPermission(user.permissions, 'TeamStatus')) && <section className="pm-team"><h2>Team Member</h2><div>{project.members.map(person => <article key={person.id}>
          <div className="project-member-avatar">{person.name.split(' ').map(part => part[0]).slice(0, 2).join('')}</div><div><strong>{person.name}</strong><small>{person.role || 'Team Member'}</small><small>{person.task_count} tasks</small></div>
        </article>)}</div></section>}
        <ProjectTasks key={`${project.id}-${taskRevision}`} project={project} />
      </> : <p>No projects available. Create a project to get started.</p>}
    </>}
  </main>
}

function ProjectTasks({ project }) {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query), 300)
    return () => clearTimeout(timer)
  }, [query])
  const [milestone, setMilestone] = useState('')
  const [assignee, setAssignee] = useState('')
  const [priority, setPriority] = useState('')
  const params = new URLSearchParams({ project: project.id, page_size: '100' })
  if (search) params.set('search', search)
  if (milestone) params.set('milestone', milestone)
  if (assignee) params.set('assigned_to', assignee)
  if (priority) params.set('priority', priority)
  const { data: rows, loading, error } = useApiData(`/tasks/?${params}`, [], apiList)
  const groups = new Map()
  rows.forEach(task => {
    const key = task.feature || task.feature_name || 'Unassigned'
    if (!groups.has(key)) groups.set(key, { name: task.feature_name || task.sprint_name || 'Unassigned', tasks: [] })
    groups.get(key).tasks.push(task)
  })
  return <section className="pm-tasks-section"><h2>Tasks</h2><div className="pm-task-table-wrap"><div className="pm-task-filters">
    <label className="project-task-search"><span className="material-symbols-outlined">search</span><input aria-label="Search project tasks" placeholder="Search tasks" value={query} onChange={event => setQuery(event.target.value)} /></label>
    <div className="project-task-filter-selects"><select aria-label="Task milestone" value={milestone} onChange={event => setMilestone(event.target.value)}><option value="">All milestones</option>{project.milestones.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
    <select aria-label="Task assignee" value={assignee} onChange={event => setAssignee(event.target.value)}><option value="">Anyone</option>{project.members.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select>
    <select aria-label="Task priority" value={priority} onChange={event => setPriority(event.target.value)}><option value="">Any priority</option>{['high','medium','low'].map(value => <option key={value} value={value}>{value[0].toUpperCase()+value.slice(1)}</option>)}</select>
    <button onClick={() => { setQuery(''); setMilestone(''); setAssignee(''); setPriority('') }}>Clear</button></div>
  </div>{error && <p role="alert">{error}</p>}<div className="live-project-table"><table><thead><tr>{['Feature','Milestone','Assigned to','Due Date','Priority'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={5}>Loading tasks...</td></tr> : groups.size ? [...groups].map(([id,group]) => <Fragment key={id}><tr className="project-feature-row"><td colSpan={5}>{group.name}</td></tr>{group.tasks.map(task => <tr key={task.id}>
    <td><strong>{task.Task_Name}</strong></td><td>{task.milestone_name || '\u2014'}</td><td><div className="project-table-assignee"><span className="project-member-avatar">{task.assigned_to_name?.split(' ').map(part => part[0]).slice(0,2).join('')}</span>{task.assigned_to_name}</div></td><td>{formatDate(task.Due_Date)}</td><td><span className={`task-priority ${task.priority}`}>{task.priority}</span></td>
  </tr>)}</Fragment>) : <tr><td colSpan={5}>No tasks found matching your filters.</td></tr>}</tbody></table></div></div></section>
}
