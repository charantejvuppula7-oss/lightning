import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../services/api/apiClient.js'
import { useProjectSelection } from '../../app/hooks/index.js'
import { projectTaskOptions } from '../projects/projectTaskOptions.js'
import AddTaskModal from '../../components/common/AddTaskModal.jsx'
import AssignTaskModal from '../../components/common/AssignTaskModal.jsx'

/* styling */
const tailwindStyling = {
  "page-content": [
    "[padding:28px]",
    "max-[600px]:[padding:16px]"
  ],
  "page-heading": [
    "[background:white]",
    "[border:1px_solid_#e5e6eb]",
    "[border-radius:12px]",
    "[padding:19px_22px_0]",
    "[margin-bottom:20px]",
    "[&_h1]:[margin:0]",
    "[&_h1]:[font-size:28px]",
    "[&_h1]:[line-height:1.25]",
    "[&_h1]:[letter-spacing:-.4px]",
    "[&_h1]:[color:#172033]",
    "[&_p]:[margin:4px_0_0]",
    "[&_p]:[font-size:14px]",
    "[&_p]:[color:#737986]"
  ],
  "task-page-heading": [
    "[display:flex]",
    "[flex-wrap:wrap]",
    "[align-items:center]",
    "[gap:12px]",
    "[padding-bottom:18px]",
    "[&_>_div:first-child]:[margin-right:auto]",
    "[&_.tabs]:[flex:1_0_100%]",
    "[&_.tabs]:[margin-top:8px]",
    "[&_>_.project-primary]:[flex:0_0_auto]",
    "[&_>_.dependency-project-picker]:[flex:0_0_auto]",
    "[&_.project-primary]:[min-height:38px]",
    "[&_.project-primary]:[padding:8px_14px]",
    "[&_.project-primary]:[border:0]",
    "[&_.project-primary]:[border-radius:7px]",
    "[&_.project-primary]:[background:#2169df]",
    "[&_.project-primary]:[color:white]",
    "[&_.project-primary]:[font:inherit]",
    "[&_.project-primary]:[font-weight:600]",
    "[&_.project-primary]:[cursor:pointer]",
    "max-[700px]:[align-items:flex-start]",
    "max-[700px]:[&_>_div:first-child]:[flex-basis:100%]"
  ],
  "task-project-picker": [
    "[&_select]:[min-height:38px]",
    "[&_select]:[padding:7px_10px]",
    "[&_select]:[border:1px_solid_#cbd5e1]",
    "[&_select]:[border-radius:7px]",
    "[&_select]:[background:white]",
    "[&_select]:[color:#334155]",
    "[&_select]:[font:inherit]",
    "[display:flex]",
    "[align-items:center]",
    "[gap:10px]",
    "[margin:12px_0]",
    "[color:#475569]",
    "[font-size:14px]",
    "max-[700px]:[align-items:flex-start]",
    "max-[700px]:[flex-direction:column]"
  ],
  "task-options-loading": [
    "[color:#64748b]",
    "[font-size:13px]"
  ],
  "task-list": [
    "[display:grid]",
    "[gap:12px]"
  ],
  "task-list-card": [
    "[display:flex]",
    "[flex-wrap:wrap]",
    "[align-items:center]",
    "[gap:16px]",
    "[padding:18px]",
    "[border:1px_solid_#dbe4ef]",
    "[border-radius:10px]",
    "[background:white]",
    "[&_>_div]:[flex:1_1_240px]",
    "[&_>_div]:[min-width:0]",
    "[&_h2]:[margin:0]",
    "[&_h2]:[color:#172033]",
    "[&_h2]:[font-size:16px]",
    "[&_p]:[margin:6px_0_0]",
    "[&_p]:[color:#64748b]",
    "[&_p]:[font-size:13px]",
    "[&_dl]:[display:grid]",
    "[&_dl]:[grid-template-columns:auto_auto]",
    "[&_dl]:[gap:4px_10px]",
    "[&_dl]:[margin:0]",
    "[&_dl]:[font-size:12px]",
    "[&_dt]:[color:#64748b]",
    "[&_dd]:[margin:0]",
    "[&_dd]:[color:#334155]",
    "[&_dd]:[text-transform:capitalize]",
    "[&_>_button]:[min-height:36px]",
    "max-[700px]:[align-items:flex-start]",
    "max-[700px]:[flex-direction:column]",
    "max-[700px]:[&_dl]:[grid-template-columns:90px_1fr]"
  ],
  "task-empty": [
    "[margin-top:12px]",
    "[padding:24px]",
    "[&_h2]:[margin:0]",
    "[&_h2]:[color:#172033]",
    "[&_h2]:[font-size:17px]",
    "[&_p]:[margin:7px_0_0]",
    "[&_p]:[color:#64748b]",
    "[&_p]:[font-size:14px]"
  ],
  "project-card": [
    "[background:#fff]",
    "[border:1px_solid_#e2e8f0]",
    "[border-radius:16px]",
    "[box-shadow:0_2px_8px_#00000005]",
    "[padding:28px]",
    "[min-width:0]",
    "[&_>_.project-grid]:[margin-bottom:20px]",
    "[&_>_.project-field]:[margin-bottom:20px]",
    "max-[700px]:[padding:18px]"
  ],
  "project-alert": [
    "[padding:12px_16px]",
    "[margin-bottom:18px]",
    "[border:1px_solid_#c8daf9]",
    "[border-radius:8px]",
    "[background:#eef5ff]",
    "[color:#264c91]",
    "[font-size:13px]",
    "[overflow-wrap:anywhere]"
  ],
  "project-primary": [
    "[display:inline-flex]",
    "[align-items:center]",
    "[justify-content:center]",
    "[min-height:42px]",
    "[box-sizing:border-box]",
    "[border-radius:9px]",
    "[padding:10px_20px]",
    "[font:inherit]",
    "[font-size:14px]",
    "[font-weight:650]",
    "[text-decoration:none]",
    "[cursor:pointer]",
    "[border:1px_solid_#3b82f6]",
    "[color:#fff]",
    "[background:#3b82f6]",
    "[&:hover]:[background:#246bd9]",
    "[&:disabled]:[opacity:.55]",
    "[&:disabled]:[cursor:wait]"
  ],
  "project-secondary": [
    "[display:inline-flex]",
    "[align-items:center]",
    "[justify-content:center]",
    "[min-height:42px]",
    "[box-sizing:border-box]",
    "[border-radius:9px]",
    "[padding:10px_20px]",
    "[font:inherit]",
    "[font-size:14px]",
    "[font-weight:650]",
    "[text-decoration:none]",
    "[cursor:pointer]",
    "[border:1px_solid_#d3dce8]",
    "[color:#56647a]",
    "[background:white]",
    "[&:hover]:[background:#f6f9fd]"
  ]
}
const styling = value => {
  const classes = typeof value === 'string' ? value : ''
  const utilities = classes.split(/\s+/).flatMap(name => tailwindStyling[name] || [])
  return [...new Set([...classes.split(/\s+/), ...utilities])].filter(Boolean).join(' ')
}



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

  return <section className={styling("page-content")}>
    <header className={styling("page-heading task-page-heading")}>
      <div><h1>My Tasks</h1><p>Tasks assigned to you across your projects.</p></div>
      {canCreate && <label className={styling("task-project-picker")} htmlFor="task-project">Project<select id="task-project" value={projectId || 'all'} onChange={event => loadProjectData(event.target.value === 'all' ? '' : event.target.value)}>
        <option value="all">All Projects</option>{projects.map(project => <option key={project.id} value={project.id}>{project.project_name}</option>)}
      </select></label>}
      {canCreate && <button className={styling("project-primary")} type="button" onClick={openCreate}>＋ Add task</button>}
    </header>
    {error && <p className={styling("project-alert")} role="alert">{error}</p>}
    {loading ? <p>Loading tasks…</p> : tasks.length ? <div className={styling("task-list")}>
      {tasks.map(task => <article className={styling("task-list-card")} key={task.id}>
        <div><h2>{task.Task_Name}</h2><p>{task.description || 'No description'}</p></div>
        <dl><dt>Project</dt><dd>{projectNames.get(String(task.project)) || 'Project'}</dd><dt>Status</dt><dd>{task.status?.replaceAll('_', ' ') || 'Open'}</dd><dt>Due</dt><dd>{task.Due_Date || '—'}</dd></dl>
        {canEdit && <button className={styling("project-secondary")} type="button" onClick={() => openAssign(task)}>Assign / reassign</button>}
      </article>)}
    </div> : <section className={styling("project-card task-empty")}><h2>No tasks found</h2><p>Tasks assigned to you will appear here.</p></section>}

    <AddTaskModal isOpen={addOpen && Boolean(projectId) && !optionsLoading} onClose={() => setAddOpen(false)} projectId={projectId}
      projectName={projectNames.get(String(projectId))} users={users} sprints={sprints} milestones={projectData?.milestones || []} features={features}
      permissions={user?.permissions} user={user} onCreated={refreshTasks} />
    {addOpen && projectId && optionsLoading && <p className={styling("task-options-loading")}>Loading project options…</p>}
    {assignTask && !optionsLoading && <AssignTaskModal isOpen onClose={() => setAssignTask(null)} initialTab="reassign" tasks={[assignTask]} users={users}
      projectId={assignTask.project} projectName={projectNames.get(String(assignTask.project))} sprints={sprints}
      milestones={projectData?.milestones || []} features={features} permissions={user?.permissions} user={user} onUpdated={refreshTasks} />}
  </section>
}
