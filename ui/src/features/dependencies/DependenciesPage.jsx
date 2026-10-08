import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../services/api/apiClient.js'
import { useProjectSelection } from '../../app/hooks/index.js'
import { projectTaskOptions } from '../projects/projectTaskOptions.js'
import AddDependencyModal from '../../components/common/AddDependencyModal.jsx'

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
  "tabs": [
    "[display:flex]",
    "[gap:0]",
    "[border-bottom:1px_solid_#aaaeb8]",
    "[margin-top:27px]",
    "[&_button]:[min-width:155px]",
    "[&_button]:[height:45px]",
    "[&_button]:[padding:0_18px]",
    "[&_button]:[border:0]",
    "[&_button]:[border-bottom:2px_solid_transparent]",
    "[&_button]:[background:transparent]",
    "[&_button]:[color:#737986]",
    "[&_button]:[font:inherit]",
    "[&_button]:[font-size:14px]",
    "[&_button]:[cursor:pointer]",
    "[&_button.selected]:[border-bottom-color:#1760d0]",
    "[&_button.selected]:[color:#1760d0]"
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
  "dependency-project-picker": [
    "[display:flex]",
    "[align-items:center]",
    "[gap:8px]",
    "[color:#475569]",
    "[font-size:13px]",
    "[&_select]:[min-height:38px]",
    "[&_select]:[padding:7px_10px]",
    "[&_select]:[border:1px_solid_#cbd5e1]",
    "[&_select]:[border-radius:7px]",
    "[&_select]:[background:white]",
    "[&_select]:[color:#334155]",
    "[&_select]:[font:inherit]",
    "max-[700px]:[flex:1_1_100%]"
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
    const url = page.next && new URL(page.next)
    next = url ? `${url.pathname.replace('/api', '')}${url.search}` : null
  }
  return items
}

export default function DependenciesPage({ user }) {
  const { projects, selectedProjectId, setSelectedProjectId, loadProjects } = useProjectSelection()
  const [dependencies, setDependencies] = useState([])
  const [tasks, setTasks] = useState([])
  const [modalTasks, setModalTasks] = useState([])
  const [members, setMembers] = useState([])
  const [activeTab, setActiveTab] = useState('waiting')
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [error, setError] = useState('')
  const canCreate = user?.permissions?.Dependencies?.Create === true
  const projectId = selectedProjectId !== 'all' ? selectedProjectId : ''

  const refresh = useCallback(() => {
    setLoading(true)
    setError('')
    setReloadKey(value => value + 1)
  }, [])

  useEffect(() => { loadProjects() }, [loadProjects])
  useEffect(() => {
    let active = true
    const query = projectId ? `&project=${encodeURIComponent(projectId)}` : ''
    Promise.all([
      loadPages(`/dependencies/?page_size=100${query}`),
      loadPages(`/tasks/?page_size=100${query}`),
    ]).then(([items, projectTasks]) => {
      if (active) { setDependencies(items); setTasks(projectTasks); setError('') }
    }).catch(requestError => {
      if (active) setError(requestError?.data?.detail || 'Unable to load dependencies.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [projectId, reloadKey])

  const taskMap = useMemo(() => new Map(tasks.map(task => [String(task.id), task])), [tasks])
  const visible = dependencies.filter(item => {
    if (activeTab === 'waiting') return String(taskMap.get(String(item.task))?.assigned_to) === String(user?.id)
    const blockingTask = taskMap.get(String(item.depends_on))
    return String(item.assigned_to) === String(user?.id) || String(blockingTask?.assigned_to) === String(user?.id)
  })

  const openCreate = async () => {
    if (!projectId) {
      setError('Select a project from the navigation bar before adding a dependency.')
      return
    }
    setError('')
    try {
      const { project: detail, users: projectUsers } = await projectTaskOptions(projectId)
      setModalTasks(detail.tasks || tasks.filter(task => String(task.project) === String(projectId)))
      setMembers(projectUsers)
      setIsOpen(true)
    } catch (requestError) {
      setError(requestError?.data?.detail || 'Unable to load project members.')
    }
  }

  return <section className={styling("page-content")}>
    <header className={styling("page-heading task-page-heading")}>
      <div><h1>Dependencies</h1><p>Every link between your work and someone else’s, in both directions.</p></div>
      {canCreate && <button className={styling("project-primary")} type="button" onClick={openCreate}>＋ Add dependency</button>}
      <div className={styling("dependency-project-picker")}><label htmlFor="dependency-project">Project</label><select id="dependency-project" value={selectedProjectId} onChange={event => setSelectedProjectId(event.target.value)}>
        <option value="all">All projects</option>{projects.map(project => <option key={project.id} value={project.id}>{project.project_name}</option>)}
      </select></div>
      <div className={styling("tabs")}><button type="button" className={styling(activeTab === 'waiting' ? 'selected' : '')} onClick={() => setActiveTab('waiting')}>You’re waiting on</button><button type="button" className={styling(activeTab === 'mine' ? 'selected' : '')} onClick={() => setActiveTab('mine')}>Waiting on you</button></div>
    </header>
    {error && <p className={styling("project-alert")} role="alert">{error}</p>}
    {loading ? <p>Loading dependencies…</p> : visible.length ? <div className={styling("task-list")}>
      {visible.map(item => <article className={styling("task-list-card")} key={item.id}>
        <div><h2>{taskMap.get(String(item.task))?.Task_Name || 'Task dependency'}</h2><p>{item.description}</p></div>
        <dl><dt>Depends on</dt><dd>{taskMap.get(String(item.depends_on))?.Task_Name || 'External dependency'}</dd><dt>Type</dt><dd>{item.dependency_type || 'optional'}</dd><dt>Due</dt><dd>{item.due_date || '—'}</dd><dt>Status</dt><dd>{item.status?.replaceAll('_', ' ') || 'Started'}</dd></dl>
      </article>)}
    </div> : <section className={styling("project-card task-empty")}><h2>No dependencies found</h2><p>Dependencies related to your tasks will appear here.</p></section>}
    <AddDependencyModal isOpen={isOpen} onClose={() => setIsOpen(false)}
      tasks={modalTasks} users={members}
      permissions={user?.permissions} user={user} onCreated={refresh} />
  </section>
}
