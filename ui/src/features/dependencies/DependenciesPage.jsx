import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../services/api/apiClient.js'
import { useProjectSelection } from '../projects/projectSelectionContext.js'
import { projectTaskOptions } from '../projects/projectTaskOptions.js'
import AddDependencyModal from '../../components/common/AddDependencyModal.jsx'

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

  return <section className="page-content">
    <header className="page-heading task-page-heading">
      <div><h1>Dependencies</h1><p>Every link between your work and someone else’s, in both directions.</p></div>
      {canCreate && <button className="project-primary" type="button" onClick={openCreate}>＋ Add dependency</button>}
      <div className="dependency-project-picker"><label htmlFor="dependency-project">Project</label><select id="dependency-project" value={selectedProjectId} onChange={event => setSelectedProjectId(event.target.value)}>
        <option value="all">All projects</option>{projects.map(project => <option key={project.id} value={project.id}>{project.project_name}</option>)}
      </select></div>
      <div className="tabs"><button type="button" className={activeTab === 'waiting' ? 'selected' : ''} onClick={() => setActiveTab('waiting')}>You’re waiting on</button><button type="button" className={activeTab === 'mine' ? 'selected' : ''} onClick={() => setActiveTab('mine')}>Waiting on you</button></div>
    </header>
    {error && <p className="project-alert" role="alert">{error}</p>}
    {loading ? <p>Loading dependencies…</p> : visible.length ? <div className="task-list">
      {visible.map(item => <article className="task-list-card" key={item.id}>
        <div><h2>{taskMap.get(String(item.task))?.Task_Name || 'Task dependency'}</h2><p>{item.description}</p></div>
        <dl><dt>Depends on</dt><dd>{taskMap.get(String(item.depends_on))?.Task_Name || 'External dependency'}</dd><dt>Type</dt><dd>{item.dependency_type || 'optional'}</dd><dt>Due</dt><dd>{item.due_date || '—'}</dd><dt>Status</dt><dd>{item.status?.replaceAll('_', ' ') || 'Started'}</dd></dl>
      </article>)}
    </div> : <section className="project-card task-empty"><h2>No dependencies found</h2><p>Dependencies related to your tasks will appear here.</p></section>}
    <AddDependencyModal isOpen={isOpen} onClose={() => setIsOpen(false)}
      tasks={modalTasks} users={members}
      permissions={user?.permissions} user={user} onCreated={refresh} />
  </section>
}
