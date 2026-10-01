import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../../services/api/apiClient.js'
import { useProjectSelection } from '../projectSelectionContext.js'
import { createProject, projectFiles, projectOptions, projectSetup, updateProject } from './projectApi.js'
import './ProjectEditorPage.css'

const steps = ['Project information', 'PDR & resources', 'Departments & Team',
  'Milestone and features', 'Configure Sprint', 'Create Tasks']
const key = () => crypto.randomUUID()
const empty = () => ({
  projectCode: '', projectName: '', description: '', customer: '', projectManager: '',
  priority: 'medium', projectType: 'web', startDate: '', endDate: '',
  links: [], files: [], pdrVersion: 'V1.0', pdrChangelog: '', departments: [], members: [],
  milestones: [], sprints: [], tasks: [], dependencies: [], pointsPerDay: 2,
  sprintDuration: 14, weekendDays: [0, 6], holidays: [],
})
const milestoneItem = () => ({ key: key(), name: '', description: '', startDate: '', dueDate: '', features: [] })
const featureItem = () => ({ key: key(), name: '', description: '', startDate: '', dueDate: '', status: 'pending', priority: 'medium' })
const taskItem = () => ({ key: key(), name: '', description: '', startDate: '', dueDate: '', priority: 'medium',
  assignee: '', reviewer: '', sprintKey: '', featureKey: '' })
const dependencyItem = (taskKey = '') => ({ key: key(), taskKey, dependsOnKey: '', description: '', assignee: '', dueDate: '' })
const dateOnly = value => value?.slice(0, 10) || ''
const userName = user => `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.user_name
const readableError = error => {
  if (!(error instanceof ApiError) || !error.data) return error.message || 'Unable to save this project.'
  const detail = error.data.detail || error.data
  if (typeof detail === 'string') return detail
  return JSON.stringify(detail)
}

function fromApi(project, files) {
  const milestones = (project.milestones || []).map(milestone => ({
    id: milestone.id, key: milestone.id, name: milestone.name || '',
    description: milestone.description || '', startDate: dateOnly(milestone.start_date),
    dueDate: dateOnly(milestone.due_date),
    features: (milestone.features || []).map(feature => ({
      id: feature.id, key: feature.id, name: feature.feature_name || '',
      description: feature.description || '', startDate: dateOnly(feature.feature_start_date),
      dueDate: dateOnly(feature.feature_due_date), status: feature.feature_status || 'pending',
      priority: feature.feature_priority || 'medium',
    })),
  }))
  const sprints = (project.sprints || []).map(sprint => ({
    id: sprint.id, key: sprint.id, number: sprint.Sprint_No || '', name: sprint.Sprint_Name || '',
    startDate: dateOnly(sprint.Sprint_start_date), endDate: dateOnly(sprint.Sprint_end_date),
    excludeWeekends: sprint.exclude_weekends ?? true, members: sprint.team_members || [],
    offDays: (sprint.off_days || []).map(dateOnly),
  }))
  const tasks = (project.tasks || []).map(task => {
    let priority = 'medium'
    try { priority = JSON.parse(task.Remarks || '{}').priority || 'medium' } catch { /* existing free text */ }
    return {
      id: task.id, key: task.id, name: task.Task_Name || '', description: task.description || '',
      startDate: dateOnly(task.planned_start_date), dueDate: dateOnly(task.Due_Date), priority,
      remarksRaw: task.Remarks || '', originalPriority: priority,
      assignee: task.assigned_to || '', reviewer: task.review_by || '',
      sprintKey: sprints.find(sprint => sprint.id === task.sprint)?.key || '',
      featureKey: milestones.flatMap(milestone => milestone.features).find(feature => feature.id === task.feature)?.key || '',
    }
  })
  return {
    projectCode: project.project_code || '', projectName: project.project_name || '',
    description: project.description || '', customer: project.customer_name || '',
    projectManager: project.project_managers?.[0] || '', priority: project.priority_name || 'medium',
    projectType: project.project_type_name || 'web', startDate: dateOnly(project.start_date),
    endDate: dateOnly(project.end_date), links: project.resource_links || [],
    files: files.map(file => ({ ...file, key: file.id })),
    pdrVersion: files.find(file => file.is_pdr)?.pdr_version || 'V1.0',
    pdrChangelog: files.find(file => file.is_pdr)?.pdr_changelog || '',
    departments: project.departments || [], members: project.team_members || [],
    milestones, sprints, tasks,
    dependencies: (project.dependencies || []).map(dependency => ({
      id: dependency.id, key: dependency.id,
      taskKey: tasks.find(task => task.id === dependency.task)?.key || '',
      dependsOnKey: tasks.find(task => task.id === dependency.depends_on)?.key || '',
      taskId: dependency.task, dependsOnId: dependency.depends_on,
      description: dependency.description || '', assignee: dependency.assigned_to || '',
      dueDate: dateOnly(dependency.due_date),
    })),
    pointsPerDay: project.points_per_working_day || 2,
    sprintDuration: sprints.length ? Math.max(1, Math.round((Date.parse(sprints[0].endDate) - Date.parse(sprints[0].startDate)) / 86400000) + 1) : 14,
    weekendDays: sprints[0]?.excludeWeekends === false ? [] : [0, 6],
    holidays: [...new Set(sprints.flatMap(sprint => sprint.offDays))],
  }
}

function validate(form) {
  const errors = {}
  if (!form.projectCode.trim()) errors.projectCode = 'Project code is required.'
  if (!form.projectName.trim()) errors.projectName = 'Project name is required.'
  if (!form.description.trim()) errors.description = 'Description is required.'
  if (!form.customer.trim()) errors.customer = 'Customer is required.'
  if (!form.projectManager) errors.projectManager = 'Select a project manager.'
  if (!form.startDate) errors.startDate = 'Start date is required.'
  if (!form.endDate) errors.endDate = 'End date is required.'
  if (form.startDate && form.endDate && form.endDate < form.startDate) errors.endDate = 'End date must follow start date.'
  if (form.links.some(link => link && !/^https?:\/\//i.test(link))) errors.links = 'Links must start with http:// or https://.'
  if (!form.departments.length) errors.departments = 'Select at least one department.'
  if (!form.members.length) errors.members = 'Select at least one team member.'
  if (!form.milestones.length) errors.milestones = 'Add at least one milestone.'
  form.milestones.forEach((milestone, index) => {
    if (!milestone.name.trim()) errors.milestones = `Milestone ${index + 1} needs a name.`
    if (!milestone.dueDate) errors.milestones = `Milestone ${index + 1} needs a due date.`
    if (milestone.startDate && milestone.dueDate && milestone.dueDate < milestone.startDate) errors.milestones = `Milestone ${index + 1} dates are invalid.`
    if (!milestone.features.length) errors.milestones = `Milestone ${index + 1} needs at least one feature.`
    milestone.features.forEach((feature, featureIndex) => {
      if (!feature.name.trim()) errors.milestones = `Feature ${featureIndex + 1} in milestone ${index + 1} needs a name.`
      if (feature.startDate && feature.dueDate && feature.dueDate < feature.startDate) errors.milestones = `Feature ${featureIndex + 1} dates are invalid.`
    })
  })
  form.sprints.forEach((sprint, index) => {
    if (!sprint.name.trim() || !sprint.startDate || !sprint.endDate || sprint.endDate < sprint.startDate)
      errors.sprints = `Sprint ${index + 1} needs a name and valid dates.`
    if (sprint.offDays.some(day => day < sprint.startDate || day > sprint.endDate))
      errors.sprints = `Sprint ${index + 1} has an off day outside its dates.`
  })
  if (!form.tasks.length) errors.tasks = 'Add at least one task.'
  form.tasks.forEach((task, index) => {
    if (!task.name.trim() || !task.assignee) errors.tasks = `Task ${index + 1} needs a name and assignee.`
    if (task.startDate && task.dueDate && task.dueDate < task.startDate) errors.tasks = `Task ${index + 1} dates are invalid.`
  })
  form.dependencies.forEach((dependency, index) => {
    if (!dependency.taskKey || !dependency.description.trim()) errors.tasks = `Dependency ${index + 1} needs a task and description.`
    if (dependency.taskKey === dependency.dependsOnKey) errors.tasks = `Dependency ${index + 1} cannot point to its own task.`
  })
  return errors
}

function Field({ label, children, error, hint }) {
  return <label className="project-field"><span>{label}</span>{children}
    {error && <small role="alert" className="project-error">{error}</small>}
    {!error && hint && <small className="project-hint">{hint}</small>}
  </label>
}

function SelectUser({ value, onChange, users, placeholder = 'Select team member', optional = false }) {
  return <select value={value} onChange={event => onChange(event.target.value)}>
    <option value="">{optional ? 'None' : placeholder}</option>
    {users.map(user => <option key={user.id} value={user.id}>{userName(user)}</option>)}
  </select>
}

export default function ProjectEditorPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { loadProjects } = useProjectSelection()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(empty)
  const [initial, setInitial] = useState(null)
  const [originalFiles, setOriginalFiles] = useState([])
  const [options, setOptions] = useState({ users: [], departments: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState({})
  const [holidayDate, setHolidayDate] = useState('')
  const [sprintOffDates, setSprintOffDates] = useState({})
  const allFeatures = useMemo(() => form.milestones.flatMap(milestone => milestone.features), [form.milestones])
  const selectedUsers = useMemo(() => options.users.filter(user => form.members.includes(user.id) || user.id === form.projectManager), [options.users, form.members, form.projectManager])

  useEffect(() => {
    let active = true
    Promise.all([projectOptions(), ...(projectId ? [projectSetup(projectId), projectFiles(projectId)] : [])])
      .then(([choices, project, files]) => {
        if (!active) return
        setOptions(choices)
        if (project) {
          const loaded = fromApi(project, files)
          setForm(loaded)
          setInitial(loaded)
          setOriginalFiles(files)
        }
      })
      .catch(error => { if (active) setMessage(readableError(error)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [projectId])

  const field = (name, value) => setForm(current => ({ ...current, [name]: value }))
  const patchItem = (collection, itemKey, change) => setForm(current => ({
    ...current, [collection]: current[collection].map(item => item.key === itemKey ? { ...item, ...change } : item),
  }))
  const removeTask = taskKey => setForm(current => ({
    ...current, tasks: current.tasks.filter(task => task.key !== taskKey),
    dependencies: current.dependencies.filter(dep => dep.taskKey !== taskKey && dep.dependsOnKey !== taskKey),
  }))
  const patchMilestone = (milestoneKey, change) => patchItem('milestones', milestoneKey, change)
  const patchFeature = (milestoneKey, featureKey, change) => setForm(current => ({
    ...current, milestones: current.milestones.map(milestone => milestone.key === milestoneKey ? {
      ...milestone, features: milestone.features.map(feature => feature.key === featureKey ? { ...feature, ...change } : feature),
    } : milestone),
  }))
  const removeMilestone = milestoneKey => setForm(current => {
    const keys = new Set(current.milestones.find(item => item.key === milestoneKey)?.features.map(feature => feature.key))
    return { ...current, milestones: current.milestones.filter(item => item.key !== milestoneKey),
      tasks: current.tasks.map(task => keys.has(task.featureKey) ? { ...task, featureKey: '' } : task) }
  })
  const removeFeature = (milestoneKey, featureKey) => setForm(current => ({
    ...current, milestones: current.milestones.map(milestone => milestone.key === milestoneKey ? {
      ...milestone, features: milestone.features.filter(feature => feature.key !== featureKey),
    } : milestone),
    tasks: current.tasks.map(task => task.featureKey === featureKey ? { ...task, featureKey: '' } : task),
  }))
  const toggle = (name, id) => field(name, form[name].includes(id) ? form[name].filter(item => item !== id) : [...form[name], id])
  const generateSprints = () => {
    if (!form.startDate || !form.endDate || form.endDate < form.startDate || Number(form.sprintDuration) < 1) {
      setMessage('Set a valid project date range and sprint duration first.')
      return
    }
    const first = Date.parse(`${form.startDate}T00:00:00Z`)
    const last = Date.parse(`${form.endDate}T00:00:00Z`)
    const duration = Number(form.sprintDuration)
    const count = Math.ceil((last - first + 86400000) / (duration * 86400000))
    if (count > 500) { setMessage('Use a longer sprint duration to keep the roadmap under 500 sprints.'); return }
    const date = time => new Date(time).toISOString().slice(0, 10)
    const sprints = Array.from({ length: count }, (_, index) => {
      const start = first + index * duration * 86400000
      const end = Math.min(last, start + (duration - 1) * 86400000)
      const standardWeekend = form.weekendDays.length === 2 && form.weekendDays.includes(0) && form.weekendDays.includes(6)
      const offDays = new Set(form.holidays.filter(day => day >= date(start) && day <= date(end)))
      if (!standardWeekend) for (let day = start; day <= end; day += 86400000) {
        if (form.weekendDays.includes(new Date(day).getUTCDay())) offDays.add(date(day))
      }
      return { key: key(), number: `SP-${String(index + 1).padStart(3, '0')}`,
        name: `Sprint ${index + 1}`, startDate: date(start),
        endDate: date(end), excludeWeekends: standardWeekend, offDays: [...offDays].sort(), members: form.members }
    })
    const oldKeys = new Set(form.sprints.map(sprint => sprint.key))
    setForm(current => ({ ...current, sprints, tasks: current.tasks.map(task => oldKeys.has(task.sprintKey) ? { ...task, sprintKey: '' } : task) }))
    setMessage('Sprints generated. Review their dates and assignments before saving.')
  }

  const goNext = () => {
    const all = validate(form)
    const stepKeys = [['projectCode', 'projectName', 'description', 'customer', 'projectManager', 'startDate', 'endDate'],
      ['links'], ['departments', 'members'], ['milestones'], ['sprints'], ['tasks']][step]
    const found = Object.fromEntries(Object.entries(all).filter(([name]) => stepKeys.includes(name)))
    setErrors(found)
    if (!Object.keys(found).length) { setStep(value => Math.min(5, value + 1)); setMessage('') }
  }
  const save = async () => {
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length) {
      const stepOrder = ['projectCode', 'projectName', 'description', 'customer', 'projectManager',
        'startDate', 'endDate', 'links', 'departments', 'members', 'milestones', 'sprints', 'tasks']
      const first = stepOrder.find(name => found[name])
      setStep(first === 'links' ? 1 : ['departments', 'members'].includes(first) ? 2 : first === 'milestones' ? 3 : first === 'sprints' ? 4 : first === 'tasks' ? 5 : 0)
      setMessage(found[first])
      return
    }
    setSaving(true)
    setMessage('')
    try {
      await (projectId ? updateProject(projectId, form, initial, originalFiles) : createProject(form))
      await loadProjects()
      navigate('/projects', { state: { saved: projectId ? 'Project updated.' : 'Project created.' } })
    } catch (error) {
      setMessage(readableError(error))
    } finally { setSaving(false) }
  }

  if (loading) return <div className="project-editor"><p>Loading project setup…</p></div>
  return <div className="project-editor">
    <div className="project-breadcrumb"><Link to="/projects">Project</Link> <span>›</span> {steps[step]}</div>
    <header className="project-editor-header"><h1>{steps[step]}</h1><p>Step <strong>{step + 1}</strong> of {steps.length} · {projectId ? 'Edit project' : 'Create new project'}</p></header>
    <nav className="project-stepper" aria-label="Project setup steps">{steps.map((label, index) =>
      <button key={label} type="button" className={index === step ? 'active' : index < step ? 'done' : ''}
        onClick={() => setStep(index)} aria-current={index === step ? 'step' : undefined}>
        <span>{index < step ? '✓' : index + 1}</span><small>{label}</small>
      </button>)}</nav>
    {message && <div className="project-alert" role="alert">{message}</div>}

    {step === 0 && <div className="project-intro-grid">
      <aside className="project-guide"><img src="/assets/downloading-data.png" alt="Project setup" />
        <h2>Let's set up your project</h2><p>Build the foundation for successful execution. You can review each section before saving.</p>
        <ul><li>Plan the timeline</li><li>Assign the team</li><li>Define milestones, sprints and tasks</li></ul>
        <div className="project-help"><strong>Need Help?</strong><p>Complete the required fields, then continue to the next step.</p></div>
      </aside>
      <section className="project-card"><div className="project-card-heading"><h2>Project Information</h2><p>Provide basic information about your project.</p></div>
        <div className="project-grid two">
          <Field label="Project code *" error={errors.projectCode} hint="Unique identifier for this project."><input maxLength={10} placeholder="e.g. AP028" value={form.projectCode} onChange={event => field('projectCode', event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))} /></Field>
          <Field label="Project Name *" error={errors.projectName}><input maxLength={200} placeholder="e.g. Industrial Data Logger" value={form.projectName} onChange={event => field('projectName', event.target.value)} /></Field>
        </div>
        <Field label="Project Description *" error={errors.description}><textarea rows={4} placeholder="Project Description..." value={form.description} onChange={event => field('description', event.target.value)} /></Field>
        <div className="project-grid three">
          <Field label="Customer / Client *" error={errors.customer}><input maxLength={200} placeholder="e.g. Acme Automation" list="project-customers" value={form.customer} onChange={event => field('customer', event.target.value)} /><datalist id="project-customers">{options.customers?.map(item => <option key={item.id} value={item.name} />)}</datalist></Field>
          <Field label="Project Manager *" error={errors.projectManager}><SelectUser value={form.projectManager} onChange={value => field('projectManager', value)} users={options.users} placeholder="Select Project Manager" /></Field>
          <Field label="Priority *"><select value={form.priority} onChange={event => field('priority', event.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field>
        </div>
        <div className="project-grid three">
          <Field label="Start date *" error={errors.startDate}><input type="date" value={form.startDate} onChange={event => field('startDate', event.target.value)} /></Field>
          <Field label="End date *" error={errors.endDate}><input type="date" min={form.startDate} value={form.endDate} onChange={event => field('endDate', event.target.value)} /></Field>
          <Field label="Project Type *"><select value={form.projectType} onChange={event => field('projectType', event.target.value)}><option value="web">Web</option><option value="mobile">Mobile</option><option value="desktop">Desktop</option><option value="other">Other</option></select></Field>
        </div>
      </section>
    </div>}

    {step === 1 && <div className="project-grid two">
      <section className="project-card"><div className="project-card-heading"><h2>Project Definition Report</h2><p>Attach the latest PDR and describe the revision.</p></div>
        <Field label="Upload PDR"><input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={event => field('files', [...form.files.filter(file => !file.is_pdr || file.id), ...Array.from(event.target.files).map(file => ({ key: key(), file, name: file.name, is_pdr: true }))])} /></Field>
        <div className="project-grid two"><Field label="Version"><input value={form.pdrVersion} onChange={event => field('pdrVersion', event.target.value)} /></Field><Field label="Change log"><input value={form.pdrChangelog} onChange={event => field('pdrChangelog', event.target.value)} /></Field></div>
        {form.files.filter(file => file.is_pdr).map(file => <div className="project-file" key={file.key}><span>{file.name}</span><button type="button" onClick={() => field('files', form.files.filter(item => item.key !== file.key))}>Remove</button></div>)}
      </section>
      <section className="project-card"><div className="project-card-heading"><h2>Resources</h2><p>Add useful links and project files.</p></div>
        <Field label="Resource links" error={errors.links}>{form.links.map((link, index) => <div className="project-inline" key={index}><input type="url" placeholder="https://example.com" value={link} onChange={event => field('links', form.links.map((item, i) => i === index ? event.target.value : item))} /><button type="button" onClick={() => field('links', form.links.filter((_, i) => i !== index))}>Remove</button></div>)}</Field>
        <button className="project-text-button" type="button" onClick={() => field('links', [...form.links, ''])}>+ Add resource link</button>
        <Field label="Upload resource files"><input type="file" multiple onChange={event => field('files', [...form.files, ...Array.from(event.target.files).map(file => ({ key: key(), file, name: file.name, is_pdr: false }))])} /></Field>
        {form.files.filter(file => !file.is_pdr).map(file => <div className="project-file" key={file.key}><span>{file.name}</span><button type="button" onClick={() => field('files', form.files.filter(item => item.key !== file.key))}>Remove</button></div>)}
      </section>
    </div>}

    {step === 2 && <div className="project-grid two">
      <section className="project-card"><div className="project-card-heading"><h2>Select Departments</h2><p>Choose the departments involved in this project.</p></div>
        <div className="project-chips">{options.departments.map(department => <button key={department.id} type="button" className={form.departments.includes(department.id) ? 'selected' : ''} onClick={() => toggle('departments', department.id)}>{department.name}</button>)}</div>
        {errors.departments && <p className="project-error">{errors.departments}</p>}
      </section>
      <section className="project-card"><div className="project-card-heading"><h2>Assign Teams</h2><p>Select active people from the chosen departments.</p></div>
        <div className="project-member-list">{options.users.filter(user => form.departments.includes(user.department_link_id)).map(user => <label key={user.id} className={form.members.includes(user.id) ? 'project-member selected' : 'project-member'}>
          <input type="checkbox" checked={form.members.includes(user.id)} onChange={() => toggle('members', user.id)} />
          <span className="project-member-avatar">{(user.first_name?.[0] || user.user_name?.[0] || '?').toUpperCase()}{(user.last_name?.[0] || '').toUpperCase()}</span>
          <span><strong>{userName(user)}</strong><small>{user.designation || user.role_link__name || 'Team member'}</small></span>
        </label>)}</div>
        {!options.users.some(user => form.departments.includes(user.department_link_id)) && <p className="project-hint">Select a department to see its members.</p>}
        {errors.members && <p className="project-error">{errors.members}</p>}
      </section>
    </div>}

    {step === 3 && <section className="project-card"><div className="project-card-heading"><h2>Milestones & Features</h2><p>Each milestone needs at least one feature.</p></div>
      {form.milestones.map((milestone, index) => <article className="project-nested-card" key={milestone.key}>
        <div className="project-row-heading"><h3>Milestone {index + 1}</h3><button type="button" onClick={() => removeMilestone(milestone.key)}>Remove</button></div>
        <div className="project-grid two"><Field label="Milestone name *"><input value={milestone.name} onChange={event => patchMilestone(milestone.key, { name: event.target.value })} placeholder="Milestone name" /></Field><Field label="Description"><input value={milestone.description} onChange={event => patchMilestone(milestone.key, { description: event.target.value })} /></Field></div>
        <div className="project-grid two"><Field label="Start date"><input type="date" value={milestone.startDate} onChange={event => patchMilestone(milestone.key, { startDate: event.target.value })} /></Field><Field label="Due date *"><input type="date" value={milestone.dueDate} onChange={event => patchMilestone(milestone.key, { dueDate: event.target.value })} /></Field></div>
        <h4>Features</h4>{milestone.features.map((feature, featureIndex) => <div className="project-feature" key={feature.key}>
          <div className="project-row-heading"><strong>Feature {featureIndex + 1}</strong><button type="button" onClick={() => removeFeature(milestone.key, feature.key)}>Remove</button></div>
          <div className="project-grid two"><Field label="Feature name *"><input value={feature.name} onChange={event => patchFeature(milestone.key, feature.key, { name: event.target.value })} /></Field><Field label="Description"><input value={feature.description} onChange={event => patchFeature(milestone.key, feature.key, { description: event.target.value })} /></Field></div>
          <div className="project-grid two"><Field label="Start date"><input type="date" value={feature.startDate} onChange={event => patchFeature(milestone.key, feature.key, { startDate: event.target.value })} /></Field><Field label="Due date"><input type="date" value={feature.dueDate} onChange={event => patchFeature(milestone.key, feature.key, { dueDate: event.target.value })} /></Field></div>
          <div className="project-grid two"><Field label="Priority"><select value={feature.priority} onChange={event => patchFeature(milestone.key, feature.key, { priority: event.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field><Field label="Status"><select value={feature.status} onChange={event => patchFeature(milestone.key, feature.key, { status: event.target.value })}><option value="pending">Pending</option><option value="in_progress">In progress</option><option value="done">Done</option></select></Field></div>
        </div>)}
        <button className="project-text-button" type="button" onClick={() => patchMilestone(milestone.key, { features: [...milestone.features, featureItem()] })}>+ Add feature</button>
      </article>)}
      <button className="project-secondary" type="button" onClick={() => field('milestones', [...form.milestones, milestoneItem()])}>+ Add milestone</button>
      {errors.milestones && <p className="project-error">{errors.milestones}</p>}
    </section>}

    {step === 4 && <section className="project-card"><div className="project-card-heading"><h2>Configure Sprint</h2><p>Generate a roadmap, then adjust any sprint before saving.</p></div>
      <div className="project-grid three"><Field label="Sprint start"><input type="date" value={form.startDate} onChange={event => field('startDate', event.target.value)} /></Field><Field label="Sprint end"><input type="date" value={form.endDate} onChange={event => field('endDate', event.target.value)} /></Field><Field label="Duration (days)"><input type="number" min="1" value={form.sprintDuration} onChange={event => field('sprintDuration', event.target.value)} /></Field></div>
      <div className="project-grid two"><Field label="Points per working day"><input type="number" min="1" value={form.pointsPerDay} onChange={event => field('pointsPerDay', event.target.value)} /></Field><div><strong className="project-small-heading">Weekend days</strong><div className="project-chips">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => <button key={day} type="button" className={form.weekendDays.includes(index) ? 'selected' : ''} onClick={() => field('weekendDays', form.weekendDays.includes(index) ? form.weekendDays.filter(item => item !== index) : [...form.weekendDays, index])}>{day}</button>)}</div></div></div>
      <div className="project-holidays"><Field label="Holidays to exclude"><input type="date" value={holidayDate} onChange={event => setHolidayDate(event.target.value)} /></Field><button className="project-secondary" type="button" onClick={() => { if (holidayDate && !form.holidays.includes(holidayDate)) field('holidays', [...form.holidays, holidayDate].sort()); setHolidayDate('') }}>Add holiday</button></div>
      <div className="project-chips">{form.holidays.map(day => <button key={day} type="button" onClick={() => field('holidays', form.holidays.filter(item => item !== day))}>{day} ×</button>)}</div>
      <button className="project-primary" type="button" onClick={generateSprints}>Generate sprints</button>
      <div className="project-sprint-list">{form.sprints.map((sprint, index) => <article className="project-nested-card" key={sprint.key}>
        <div className="project-row-heading"><h3>Sprint {index + 1}</h3><button type="button" onClick={() => { field('sprints', form.sprints.filter(item => item.key !== sprint.key)); setForm(current => ({ ...current, tasks: current.tasks.map(task => task.sprintKey === sprint.key ? { ...task, sprintKey: '' } : task) })) }}>Remove</button></div>
        <div className="project-grid four"><Field label="Code"><input value={sprint.number} onChange={event => patchItem('sprints', sprint.key, { number: event.target.value })} /></Field><Field label="Name"><input value={sprint.name} onChange={event => patchItem('sprints', sprint.key, { name: event.target.value })} /></Field><Field label="Start"><input type="date" value={sprint.startDate} onChange={event => patchItem('sprints', sprint.key, { startDate: event.target.value })} /></Field><Field label="End"><input type="date" value={sprint.endDate} onChange={event => patchItem('sprints', sprint.key, { endDate: event.target.value })} /></Field></div>
        <Field label="Sprint members"><div className="project-chips">{selectedUsers.map(user => <button key={user.id} type="button" className={sprint.members.includes(user.id) ? 'selected' : ''} onClick={() => patchItem('sprints', sprint.key, { members: sprint.members.includes(user.id) ? sprint.members.filter(id => id !== user.id) : [...sprint.members, user.id] })}>{userName(user)}</button>)}</div></Field>
        <div className="project-grid two"><label className="project-check"><input type="checkbox" checked={sprint.excludeWeekends} onChange={event => patchItem('sprints', sprint.key, { excludeWeekends: event.target.checked })} /> Exclude Saturday and Sunday</label><div><Field label="Additional off days"><input type="date" value={sprintOffDates[sprint.key] || ''} onChange={event => setSprintOffDates(current => ({ ...current, [sprint.key]: event.target.value }))} /></Field><button className="project-text-button" type="button" onClick={() => { const day = sprintOffDates[sprint.key]; if (day && !sprint.offDays.includes(day)) patchItem('sprints', sprint.key, { offDays: [...sprint.offDays, day].sort() }); setSprintOffDates(current => ({ ...current, [sprint.key]: '' })) }}>+ Add off day</button></div></div>
        <div className="project-chips">{sprint.offDays.map(day => <button key={day} type="button" onClick={() => patchItem('sprints', sprint.key, { offDays: sprint.offDays.filter(item => item !== day) })}>{day} ×</button>)}</div>
      </article>)}</div>
      <button className="project-secondary" type="button" onClick={() => field('sprints', [...form.sprints, { key: key(), number: `SP-${String(form.sprints.length + 1).padStart(3, '0')}`, name: `Sprint ${form.sprints.length + 1}`, startDate: form.startDate, endDate: form.endDate, excludeWeekends: true, offDays: [], members: form.members }])}>+ Add sprint</button>
      {errors.sprints && <p className="project-error">{errors.sprints}</p>}
    </section>}

    {step === 5 && <div className="project-grid task-step"><section className="project-card"><div className="project-card-heading"><h2>Create Tasks</h2><p>Assign work to project members and connect tasks to sprints and features.</p></div>
      {form.tasks.map((task, index) => <article className="project-nested-card" key={task.key}>
        <div className="project-row-heading"><h3>Task {index + 1}</h3><button type="button" onClick={() => removeTask(task.key)}>Remove</button></div>
        <Field label="Task name *"><input maxLength={100} value={task.name} placeholder="Task name" onChange={event => patchItem('tasks', task.key, { name: event.target.value })} /></Field>
        <Field label="Description"><textarea rows={3} value={task.description} onChange={event => patchItem('tasks', task.key, { description: event.target.value })} /></Field>
        <div className="project-grid two"><Field label="Start date"><input type="date" value={task.startDate} onChange={event => patchItem('tasks', task.key, { startDate: event.target.value })} /></Field><Field label="Due date"><input type="date" value={task.dueDate} onChange={event => patchItem('tasks', task.key, { dueDate: event.target.value })} /></Field></div>
        <div className="project-grid three"><Field label="Sprint"><select value={task.sprintKey} onChange={event => patchItem('tasks', task.key, { sprintKey: event.target.value })}><option value="">No sprint</option>{form.sprints.map(sprint => <option key={sprint.key} value={sprint.key}>{sprint.name}</option>)}</select></Field><Field label="Feature"><select value={task.featureKey} onChange={event => patchItem('tasks', task.key, { featureKey: event.target.value })}><option value="">No feature</option>{allFeatures.map(feature => <option key={feature.key} value={feature.key}>{feature.name || 'Unnamed feature'}</option>)}</select></Field><Field label="Priority"><select value={task.priority} onChange={event => patchItem('tasks', task.key, { priority: event.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field></div>
        <div className="project-grid two"><Field label="Assigned to *"><SelectUser users={selectedUsers} value={task.assignee} onChange={value => patchItem('tasks', task.key, { assignee: value })} /></Field><Field label="Reviewer"><SelectUser users={selectedUsers} value={task.reviewer} onChange={value => patchItem('tasks', task.key, { reviewer: value })} optional /></Field></div>
        <button className="project-text-button" type="button" onClick={() => field('dependencies', [...form.dependencies, dependencyItem(task.key)])}>+ Add dependency</button>
      </article>)}
      <button className="project-secondary" type="button" onClick={() => field('tasks', [...form.tasks, taskItem()])}>+ Add task</button>
      {errors.tasks && <p className="project-error">{errors.tasks}</p>}
    </section><section className="project-card project-dependencies"><div className="project-card-heading"><h2>Dependencies</h2><p>Track blockers for the tasks in this project.</p></div>
      {form.dependencies.map((dependency, index) => <article className="project-nested-card" key={dependency.key}>
        <div className="project-row-heading"><h3>Dependency {index + 1}</h3><button type="button" onClick={() => field('dependencies', form.dependencies.filter(item => item.key !== dependency.key))}>Remove</button></div>
        <Field label="Task"><select value={dependency.taskKey} onChange={event => patchItem('dependencies', dependency.key, { taskKey: event.target.value })}><option value="">Select task</option>{form.tasks.map(task => <option key={task.key} value={task.key}>{task.name || 'Unnamed task'}</option>)}</select></Field>
        <Field label="Depends on"><select value={dependency.dependsOnKey} onChange={event => patchItem('dependencies', dependency.key, { dependsOnKey: event.target.value })}><option value="">No linked task</option>{form.tasks.filter(task => task.key !== dependency.taskKey).map(task => <option key={task.key} value={task.key}>{task.name || 'Unnamed task'}</option>)}</select></Field>
        <Field label="Description *"><textarea rows={2} value={dependency.description} onChange={event => patchItem('dependencies', dependency.key, { description: event.target.value })} /></Field>
        <Field label="Assigned to"><SelectUser users={selectedUsers} value={dependency.assignee} onChange={value => patchItem('dependencies', dependency.key, { assignee: value })} optional /></Field>
        <Field label="Due date"><input type="date" value={dependency.dueDate} onChange={event => patchItem('dependencies', dependency.key, { dueDate: event.target.value })} /></Field>
      </article>)}
      {!form.dependencies.length && <p className="project-hint">Add a dependency from a task if it has a blocker.</p>}
    </section></div>}

    <footer className="project-editor-actions"><Link to="/projects" className="project-secondary">Cancel</Link>
      <div>{step > 0 && <button type="button" className="project-secondary" onClick={() => setStep(value => value - 1)}>Back</button>}
        {step < 5 ? <button type="button" className="project-primary" onClick={goNext}>Continue</button> :
          <button type="button" className="project-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : projectId ? 'Update Project' : 'Create Project'}</button>}
      </div></footer>
  </div>
}
