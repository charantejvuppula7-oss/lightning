import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../services/api/apiClient.js'
import { useProjectSelection } from '../projects/projectSelectionContext.js'
import { projectTaskOptions } from '../projects/projectTaskOptions.js'
import AddTaskModal from '../../components/common/AddTaskModal.jsx'
import AssignTaskModal from '../../components/common/AssignTaskModal.jsx'

async function loadPages(path) {
  const items = []
  let next = path
  while (next) {
    const page = await apiRequest(next)
    items.push(...(page.results || []))
    next = page.next ? `${new URL(page.next).pathname.replace('/api', '')}${new URL(page.next).search}` : null
  }
  return items
}

export default function TasksPage({ user }) {
  const { projects, selectedProjectId, setSelectedProjectId, loadProjects } = useProjectSelection()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [assignTask, setAssignTask] = useState(null)
  const [projectData, setProjectData] = useState(null)
  const [users, setUsers] = useState([])
  const [optionsLoading, setOptionsLoading] = useState(false)

  const canCreate = user?.permissions?.Tasks?.Create === true
  const canEdit = user?.permissions?.Tasks?.Edit === true
  const projectId = selectedProjectId !== 'all' ? selectedProjectId : ''

  const refreshTasks = useCallback(() => {
    setLoading(true)
    setError('')
    setReloadKey(value => value + 1)
  }, [])

  useEffect(() => { loadProjects() }, [loadProjects])
  useEffect(() => {
    let active = true
    const query = user?.id ? `&assigned_to=${encodeURIComponent(user.id)}` : ''
    loadPages(`/tasks/?page_size=100${query}`)
      .then(items => { if (active) { setTasks(items); setError('') } })
      .catch(requestError => { if (active) setError(requestError?.data?.detail || 'Unable to load tasks.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user?.id, reloadKey])

  const loadProjectData = async id => {
    setSelectedProjectId(id || 'all')
    setProjectData(null)
    setUsers([])
    if (!id) return null
    setOptionsLoading(true)
    try {
      const { project: detail, users: projectUsers } = await projectTaskOptions(id)
      setProjectData(detail)
      setUsers(projectUsers)
      return detail
    } catch (requestError) {
      setError(requestError?.data?.detail || 'Unable to load project members and task options.')
      return null
    } finally {
      setOptionsLoading(false)
    }
  }

  const sprints = projectData?.sprints || []
  const features = useMemo(() => (projectData?.milestones || []).flatMap(milestone =>
    (milestone.features || []).map(feature => ({ ...feature, milestone: milestone.id }))), [projectData])
  const projectNames = useMemo(() => new Map(projects.map(project => [String(project.id), project.project_name])), [projects])

  const openCreate = async () => {
    if (!projectId) {
      setError('Select a project before adding a task.')
      return
    }
    const detail = await loadProjectData(projectId)
    if (detail) setAddOpen(true)
  }

  const openAssign = async task => {
    if (task.project && !(await loadProjectData(task.project))) return
    setAssignTask(task)
  }

  return <section className="page-content">
    <header className="page-heading task-page-heading">
      <div><h1>My Tasks</h1><p>Tasks assigned to you across your projects.</p></div>
      {canCreate && <label className="task-project-picker" htmlFor="task-project">Project<select id="task-project" value={projectId || 'all'} onChange={event => loadProjectData(event.target.value === 'all' ? '' : event.target.value)}>
        <option value="all">All Projects</option>{projects.map(project => <option key={project.id} value={project.id}>{project.project_name}</option>)}
      </select></label>}
      {canCreate && <button className="project-primary" type="button" onClick={openCreate}>＋ Add task</button>}
    </header>
    {error && <p className="project-alert" role="alert">{error}</p>}
    {loading ? <p>Loading tasks…</p> : tasks.length ? <div className="task-list">
      {tasks.map(task => <article className="task-list-card" key={task.id}>
        <div><h2>{task.Task_Name}</h2><p>{task.description || 'No description'}</p></div>
        <dl><dt>Project</dt><dd>{projectNames.get(String(task.project)) || 'Project'}</dd><dt>Status</dt><dd>{task.status?.replaceAll('_', ' ') || 'Open'}</dd><dt>Due</dt><dd>{task.Due_Date || '—'}</dd></dl>
        {canEdit && <button className="project-secondary" type="button" onClick={() => openAssign(task)}>Assign / reassign</button>}
      </article>)}
    </div> : <section className="project-card task-empty"><h2>No tasks found</h2><p>Tasks assigned to you will appear here.</p></section>}

    <AddTaskModal isOpen={addOpen && Boolean(projectId) && !optionsLoading} onClose={() => setAddOpen(false)} projectId={projectId}
      projectName={projectNames.get(String(projectId))} users={users} sprints={sprints} milestones={projectData?.milestones || []} features={features}
      permissions={user?.permissions} user={user} onCreated={refreshTasks} />
    {addOpen && projectId && optionsLoading && <p className="task-options-loading">Loading project options…</p>}
    {assignTask && !optionsLoading && <AssignTaskModal isOpen onClose={() => setAssignTask(null)} initialTab="reassign" tasks={[assignTask]} users={users}
      projectId={assignTask.project} projectName={projectNames.get(String(assignTask.project))} sprints={sprints}
      milestones={projectData?.milestones || []} features={features} permissions={user?.permissions} user={user} onUpdated={refreshTasks} />}
  </section>
}
