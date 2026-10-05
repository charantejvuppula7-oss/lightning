import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../../services/api/apiClient.js'
import { roleSlug } from '../../../utils/roles.js'
import { useProjectSelection } from '../projectSelectionContext.js'
import { createProject, projectFiles, projectOptions, projectSetup, updateProject } from './projectApi.js'
import './ProjectEditorPage.css'

const steps = ['Project information', 'PDR & resources', 'Departments & Team',
  'Milestone and features', 'Configure Sprint', 'Create Tasks']
const DRAFT_KEY = 'pm_create_project_draft'
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
const departmentMeta = {
  Hardware: ['HW', 'memory', 'Hardware design, circuit design, PCB, prototyping', '#16a34a', '#f0fdf4'],
  Firmware: ['FW', 'developer_board', 'Embedded firmware, BSP, drivers, bootloaders', '#eab308', '#fef9c3'],
  Software: ['SW', 'code', 'Application software, cloud, mobile, website', '#3b82f6', '#eff6ff'],
  Mechanical: ['ME', 'settings', 'Mechanical design, enclosure, CAD', '#f97316', '#fff7ed'],
  Testing: ['TE', 'science', 'Test planning, validation and verification', '#a855f7', '#faf5ff'],
  Production: ['PR', 'factory', 'Manufacturing and production support', '#ef4444', '#fef2f2'],
  'Quality Assurance': ['QA', 'verified_user', 'Quality planning, audits and compliance', '#0d9488', '#f0fdfa'],
  QA: ['QA', 'verified_user', 'Quality planning, audits and compliance', '#0d9488', '#f0fdfa'],
  Documentation: ['Doc', 'description', 'Technical writing, user docs, manuals', '#64748b', '#f1f5f9'],
  Management: ['MG', 'groups', 'Project planning, coordination, resource management', '#7c3aed', '#f5f3ff'],
}
const departmentOrder = ['Hardware', 'Firmware', 'Software', 'Mechanical', 'Testing', 'Production', 'Quality Assurance', 'QA', 'Documentation', 'Management']
const fileLimit = 100 * 1024 * 1024
const pdrExtensions = new Set(['pdf', 'doc', 'docx'])
const resourceExtensions = new Set(['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'csv', 'zip', 'rar'])
const extension = name => name.split('.').pop()?.toLowerCase() || ''
const fileSize = size => size == null ? '—' : size < 1024 * 1024
  ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`
const formatDate = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
  month: 'long', day: 'numeric', year: 'numeric',
}) : 'N/A'
const sprintWorkingDays = sprint => {
  if (!sprint.startDate || !sprint.endDate) return 0
  let days = 0
  for (let time = Date.parse(`${sprint.startDate}T00:00:00Z`); time <= Date.parse(`${sprint.endDate}T00:00:00Z`); time += 86400000) {
    const date = new Date(time)
    const value = date.toISOString().slice(0, 10)
    if ((!sprint.excludeWeekends || ![0, 6].includes(date.getUTCDay())) && !sprint.offDays.includes(value)) days += 1
  }
  return days
}
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

function validate(form, projectOnly = false) {
  const errors = {}
  if (!form.projectCode.trim()) errors.projectCode = 'Project code is required.'
  else if (form.projectCode.trim().length < 2) errors.projectCode = 'Project code must be at least 2 characters.'
  if (!form.projectName.trim()) errors.projectName = 'Project name is required.'
  else if (form.projectName.trim().length < 3) errors.projectName = 'Project name must be at least 3 characters.'
  if (!form.description.trim()) errors.description = 'Description is required.'
  else if (form.description.trim().length < 10) errors.description = 'Description must be at least 10 characters.'
  if (!form.customer.trim()) errors.customer = 'Customer is required.'
  else if (form.customer.trim().length < 2) errors.customer = 'Customer must be at least 2 characters.'
  if (!form.projectManager) errors.projectManager = 'Select a project manager.'
  if (!form.priority) errors.priority = 'Select a priority.'
  if (!form.projectType) errors.projectType = 'Select a project type.'
  if (!form.startDate) errors.startDate = 'Start date is required.'
  if (!form.endDate) errors.endDate = 'End date is required.'
  if (form.startDate && form.endDate && form.endDate <= form.startDate) errors.endDate = 'End date must be after start date.'
  if (form.links.some(link => link && !/^https?:\/\//i.test(link))) errors.links = 'Links must start with http:// or https://.'
  if (!form.files.some(item => item.is_pdr)) errors.pdrFile = 'Upload a PDR to continue.'
  if (!form.pdrVersion.trim()) errors.pdrVersion = 'PDR version is required.'
  if (form.files.some(item => item.is_pdr && item.file?.size > fileLimit)) errors.pdrFile = 'PDR file exceeds the 100 MB limit.'
  if (form.files.some(item => !item.is_pdr && item.file?.size > fileLimit)) errors.resourceFiles = 'Resource files must be 100 MB or smaller.'
  if (!form.departments.length) errors.departments = 'Select at least one department.'
  if (projectOnly) return errors
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

export default function ProjectEditorPage({ user }) {
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
  const [openTeamDepartment, setOpenTeamDepartment] = useState(null)
  const [milestoneDraft, setMilestoneDraft] = useState(milestoneItem)
  const [editingMilestoneKey, setEditingMilestoneKey] = useState(null)
  const [expandedMilestones, setExpandedMilestones] = useState({})
  const [taskDraft, setTaskDraft] = useState(taskItem)
  const [editingTaskKey, setEditingTaskKey] = useState(null)
  const canCreateChildren = roleSlug(user?.role) === 'admin' || ['Milestones', 'Features', 'Tasks'].every(
    module => user?.permissions?.[module]?.Create === true,
  )
  const projectOnlyCreation = !projectId && !canCreateChildren
  const visibleSteps = projectOnlyCreation ? steps.slice(0, 3) : steps
  const lastStep = visibleSteps.length - 1
  const draftKey = `${DRAFT_KEY}:${user?.id || 'anonymous'}`
  const allFeatures = useMemo(() => form.milestones.flatMap(milestone => milestone.features), [form.milestones])
  const selectedUsers = useMemo(() => options.users.filter(user => form.members.includes(user.id) || user.id === form.projectManager), [options.users, form.members, form.projectManager])
  const departments = useMemo(() => [...options.departments].sort((a, b) => {
    const aIndex = departmentOrder.indexOf(a.name)
    const bIndex = departmentOrder.indexOf(b.name)
    return (aIndex < 0 ? departmentOrder.length : aIndex) - (bIndex < 0 ? departmentOrder.length : bIndex) || a.name.localeCompare(b.name)
  }), [options.departments])

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
        } else {
          try {
            const draft = JSON.parse(localStorage.getItem(draftKey))
            if (draft) setForm(current => ({ ...current, ...draft, files: [] }))
          } catch { localStorage.removeItem(draftKey) }
        }
      })
      .catch(error => { if (active) setMessage(readableError(error)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [draftKey, projectId])

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
  const resetMilestoneDraft = () => { setMilestoneDraft(milestoneItem()); setEditingMilestoneKey(null) }
  const saveMilestoneDraft = () => {
    if (!milestoneDraft.name.trim() || !milestoneDraft.startDate || !milestoneDraft.dueDate) {
      setErrors(current => ({ ...current, milestones: 'Milestone name, start date and end date are required.' }))
      return
    }
    if (milestoneDraft.dueDate < milestoneDraft.startDate) {
      setErrors(current => ({ ...current, milestones: 'Milestone end date must be after its start date.' }))
      return
    }
    const savedKey = editingMilestoneKey || key()
    setForm(current => ({ ...current, milestones: editingMilestoneKey
      ? current.milestones.map(item => item.key === editingMilestoneKey ? { ...item, ...milestoneDraft, key: item.key } : item)
      : [...current.milestones, { ...milestoneDraft, key: savedKey, features: [] }] }))
    setExpandedMilestones(current => ({ ...current, [savedKey]: true }))
    setErrors(current => ({ ...current, milestones: '' }))
    resetMilestoneDraft()
  }
  const editMilestone = milestone => {
    setMilestoneDraft({ ...milestone })
    setEditingMilestoneKey(milestone.key)
    document.getElementById('milestone-add-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  const resetTaskDraft = () => { setTaskDraft(taskItem()); setEditingTaskKey(null) }
  const saveTaskDraft = () => {
    if (!taskDraft.name.trim() || !taskDraft.assignee) {
      setErrors(current => ({ ...current, tasks: 'Task name and assignee are required.' }))
      return
    }
    if (taskDraft.startDate && taskDraft.dueDate && taskDraft.dueDate < taskDraft.startDate) {
      setErrors(current => ({ ...current, tasks: 'Task due date must be after its start date.' }))
      return
    }
    setForm(current => ({ ...current, tasks: editingTaskKey
      ? current.tasks.map(item => item.key === editingTaskKey ? { ...item, ...taskDraft, key: item.key } : item)
      : [...current.tasks, { ...taskDraft, key: key() }] }))
    setErrors(current => ({ ...current, tasks: '' }))
    resetTaskDraft()
  }
  const editTask = task => { setTaskDraft({ ...task }); setEditingTaskKey(task.key) }
  const toggle = (name, id) => field(name, form[name].includes(id) ? form[name].filter(item => item !== id) : [...form[name], id])
  const toggleDepartment = id => setForm(current => {
    if (!current.departments.includes(id)) return { ...current, departments: [...current.departments, id] }
    const departmentUserIds = new Set(options.users.filter(item => item.department_link_id === id).map(item => item.id))
    return { ...current, departments: current.departments.filter(item => item !== id),
      members: current.members.filter(userId => !departmentUserIds.has(userId)) }
  })
  const addFiles = (files, isPdr) => {
    const selected = Array.from(files)
    const allowed = isPdr ? pdrExtensions : resourceExtensions
    const invalid = selected.find(file => !allowed.has(extension(file.name)) || file.size > fileLimit)
    if (invalid) {
      setErrors(current => ({ ...current, [isPdr ? 'pdrFile' : 'resourceFiles']:
        `${invalid.name}: choose a supported file of 100 MB or less.` }))
      return
    }
    const items = (isPdr ? selected.slice(0, 1) : selected).map(file => ({
      key: key(), file, name: file.name, size: file.size, is_pdr: isPdr,
    }))
    setForm(current => ({ ...current, files: isPdr
      ? [...current.files.filter(item => !item.is_pdr), ...items]
      : [...current.files, ...items] }))
    setErrors(current => ({ ...current, [isPdr ? 'pdrFile' : 'resourceFiles']: '' }))
  }
  const downloadFile = item => {
    if (item.url) { window.open(item.url, '_blank', 'noopener,noreferrer'); return }
    if (!item.file) return
    const url = URL.createObjectURL(item.file)
    const link = document.createElement('a')
    link.href = url
    link.download = item.name
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
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
    const all = validate(form, projectOnlyCreation)
    const stepKeys = [['projectCode', 'projectName', 'description', 'customer', 'projectManager', 'priority', 'projectType', 'startDate', 'endDate'],
      ['links', 'pdrFile', 'pdrVersion', 'resourceFiles'], ['departments'], ['milestones'], ['sprints'], ['tasks']][step]
    const found = Object.fromEntries(Object.entries(all).filter(([name]) => stepKeys.includes(name)))
    setErrors(found)
    if (!Object.keys(found).length) { setStep(value => Math.min(lastStep, value + 1)); setMessage('') }
  }
  const save = async () => {
    const found = validate(form, projectOnlyCreation)
    setErrors(found)
    if (Object.keys(found).length) {
      const stepOrder = ['projectCode', 'projectName', 'description', 'customer', 'projectManager',
        'priority', 'projectType', 'startDate', 'endDate', 'links', 'pdrFile', 'pdrVersion', 'resourceFiles', 'departments', 'milestones', 'sprints', 'tasks']
      const first = stepOrder.find(name => found[name])
      setStep(['links', 'pdrFile', 'pdrVersion', 'resourceFiles'].includes(first) ? 1 : first === 'departments' ? 2 : first === 'milestones' ? 3 : first === 'sprints' ? 4 : first === 'tasks' ? 5 : 0)
      setMessage(found[first])
      return
    }
    setSaving(true)
    setMessage('')
    try {
      await (projectId ? updateProject(projectId, form, initial, originalFiles) : createProject(form, projectOnlyCreation))
      if (!projectId) localStorage.removeItem(draftKey)
      await loadProjects()
      navigate('/projects', { state: { saved: projectId ? 'Project updated.' : 'Project created.' } })
    } catch (error) {
      setMessage(readableError(error))
    } finally { setSaving(false) }
  }

  const saveDraft = () => {
    const serializable = { ...form, files: [] }
    localStorage.setItem(draftKey, JSON.stringify(serializable))
    setMessage('Draft saved in this browser. You can continue later.')
  }

  if (loading) return <div className="project-editor"><p>Loading project setup…</p></div>
  return <div className="project-editor">
    <div className="project-breadcrumb"><Link to="/projects">Project</Link> <span>›</span> {visibleSteps[step]}</div>
    <header className="project-editor-header"><h1>{visibleSteps[step]}</h1><p>Step <strong>{step + 1}</strong> of {visibleSteps.length} · {projectId ? 'Edit project' : 'Create new project'}</p></header>
    <nav className="project-stepper" aria-label="Project setup steps">{visibleSteps.map((label, index) =>
      <button key={label} type="button" className={index === step ? 'active' : index < step ? 'done' : ''}
        onClick={() => setStep(index)} aria-current={index === step ? 'step' : undefined}>
        <span>{index < step ? '✓' : index + 1}</span><small>{label}</small>
      </button>)}</nav>
    {message && <div className="project-alert" role="alert">{message}</div>}
    <div className={step === 1 ? 'project-step-shell' : 'project-step-body'}>

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
          <Field label="Priority *" error={errors.priority}><select value={form.priority} onChange={event => field('priority', event.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field>
        </div>
        <div className="project-grid three">
          <Field label="Start date *" error={errors.startDate}><input type="date" value={form.startDate} onChange={event => field('startDate', event.target.value)} /></Field>
          <Field label="End date *" error={errors.endDate}><input type="date" min={form.startDate} value={form.endDate} onChange={event => field('endDate', event.target.value)} /></Field>
          <Field label="Project Type *" error={errors.projectType}><select value={form.projectType} onChange={event => field('projectType', event.target.value)}><option value="web">Web</option><option value="mobile">Mobile</option><option value="desktop">Desktop</option><option value="other">Other</option></select></Field>
        </div>
      </section>
    </div>}

    {step === 1 && <div className="project-resource-layout">
      <section className="project-card project-upload-card"><h2>Upload PDR (Mandatory)</h2>
        <div className="project-info-strip"><span className="material-symbols-outlined">info</span><p>The PDR is mandatory and enables the team to understand the scope, objectives, deliverables and constraints of the project.</p></div>
        <label className="project-drop-zone" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); addFiles(event.dataTransfer.files, true) }}>
          <input type="file" accept=".pdf,.doc,.docx" onChange={event => { addFiles(event.target.files, true); event.target.value = '' }} />
          <span className="material-symbols-outlined">cloud_upload</span><strong>Browse Files</strong><small>Accepted formats: PDF, DOCX, Max file size: 100 MB</small>
        </label>
        {errors.pdrFile && <p className="project-error">{errors.pdrFile}</p>}
        {form.files.filter(item => item.is_pdr).map(item => <div className="project-file" key={item.key}><span className="file-type">{extension(item.name).toUpperCase()}</span><span className="file-name"><strong>{item.name}</strong><small>{fileSize(item.size ?? item.file?.size)}</small></span><button type="button" title="Download PDR" onClick={() => downloadFile(item)}><span className="material-symbols-outlined">download</span></button><button type="button" title="Remove PDR" onClick={() => field('files', form.files.filter(file => file.key !== item.key))}><span className="material-symbols-outlined">delete</span></button></div>)}
        <div className="project-upload-details"><h3>PDR Details</h3><div className="project-grid two"><Field label="PDR Version *" error={errors.pdrVersion}><input value={form.pdrVersion} onChange={event => field('pdrVersion', event.target.value)} /></Field><Field label="Change Log (optional)"><input placeholder={form.projectCode || 'AP000'} value={form.pdrChangelog} onChange={event => field('pdrChangelog', event.target.value)} /></Field></div></div>
      </section>
      <section className="project-card project-upload-card"><h2>Upload Resources <span>(Optional)</span></h2>
        <div className="project-info-strip"><span className="material-symbols-outlined">info</span><p>Add related documents, templates, datasets or any other resources.</p></div>
        <label className="project-drop-zone" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); addFiles(event.dataTransfer.files, false) }}>
          <input type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.zip,.rar" onChange={event => { addFiles(event.target.files, false); event.target.value = '' }} />
          <span className="material-symbols-outlined">cloud_upload</span><strong>Browse Files</strong><small>Accepted formats: PDF, DOCX, ZIP, PPTX, XLSX, Max file size: 100 MB</small>
        </label>
        {errors.resourceFiles && <p className="project-error">{errors.resourceFiles}</p>}
        <div className="project-upload-details"><h3>Upload Resources</h3>
          {form.files.some(item => !item.is_pdr) ? <div className="project-files-table"><table><thead><tr><th>File Name</th><th>Type</th><th>Size</th><th>Uploaded By</th><th>Date</th><th>Action</th></tr></thead><tbody>{form.files.filter(item => !item.is_pdr).map(item => <tr key={item.key}><td><span className="file-type">{extension(item.name).toUpperCase()}</span>{item.name}</td><td>{extension(item.name).toUpperCase()}</td><td>{fileSize(item.size ?? item.file?.size)}</td><td>{item.uploaded_by_name || (item.file ? userName(user) : '—')}</td><td>{item.uploaded_at ? new Date(item.uploaded_at).toLocaleDateString('en-GB') : item.file ? new Date().toLocaleDateString('en-GB') : '—'}</td><td><button type="button" title="Download" onClick={() => downloadFile(item)}><span className="material-symbols-outlined">download</span></button><button type="button" title="Remove" onClick={() => field('files', form.files.filter(file => file.key !== item.key))}><span className="material-symbols-outlined">delete</span></button></td></tr>)}</tbody></table></div>
            : <div className="project-no-files">No resource files uploaded yet</div>}
        </div>
        <details className="project-resource-links"><summary>Resource links {form.links.filter(Boolean).length ? `(${form.links.filter(Boolean).length})` : ''}</summary>
          {form.links.map((link, index) => <div className="project-inline" key={index}><input type="url" placeholder="https://example.com" value={link} onChange={event => field('links', form.links.map((item, i) => i === index ? event.target.value : item))} /><button type="button" onClick={() => field('links', form.links.filter((_, i) => i !== index))}>Remove</button></div>)}
          <button className="project-text-button" type="button" onClick={() => field('links', [...form.links, ''])}>+ Add resource link</button>
        </details>
        {errors.links && <p className="project-error">{errors.links}</p>}
      </section>
    </div>}

    {step === 2 && <div className="project-team-layout">
      <section className="project-card department-section"><h2>Select Departments</h2>
        <div className="project-info-strip"><span className="material-symbols-outlined">info</span><p>Select all departments that will be contributing to this project.</p></div>
        <div className="department-grid">{departments.map(department => {
          const [code, icon, description, color, background] = departmentMeta[department.name] || ['', 'apartment', 'Project department', '#2563eb', '#eff6ff']
          const selected = form.departments.includes(department.id)
          return <button key={department.id} type="button" aria-pressed={selected} className={selected ? 'department-card selected' : 'department-card'} onClick={() => toggleDepartment(department.id)}>
            <span className="department-icon material-symbols-outlined" style={{ color, background }}>{icon}</span><span className="department-copy"><strong>{department.name}{code ? ` (${code})` : ''}</strong><small>{description}</small></span><span className="department-check material-symbols-outlined">{selected ? 'check' : ''}</span>
          </button>
        })}</div>
        {errors.departments && <p className="project-error">{errors.departments}</p>}
      </section>
      <section className="project-card assign-team-card"><div className="project-card-heading"><h2>Assign Teams</h2><p>Select the team members from each department who will work on this project</p></div>
        {!form.departments.length ? <div className="project-empty-state"><span className="material-symbols-outlined">group</span><strong>No departments selected</strong><p>Select departments above to start building your team.</p></div> :
          <div className="project-team-table"><div className="project-team-table-head"><span>Department</span><span>Team Lead</span><span>Assigned Team</span><span>Team Members</span></div>
          {departments.filter(department => form.departments.includes(department.id)).map(department => {
            const [code, icon, , color, background] = departmentMeta[department.name] || ['', 'apartment', '', '#2563eb', '#eff6ff']
            const people = options.users.filter(item => item.department_link_id === department.id)
            const manager = options.users.find(item => item.id === form.projectManager)
            const isManagement = department.name.toLowerCase() === 'management'
            const candidates = isManagement && manager && !people.some(item => item.id === manager.id) ? [manager, ...people] : people
            const selected = candidates.filter(item => form.members.includes(item.id) || (isManagement && item.id === form.projectManager))
            const lead = isManagement && manager ? manager : selected.find(item => /lead/i.test(item.designation || '')) || selected[0]
            return <div className="project-team-table-row" key={department.id}>
              <span className="team-department"><span className="material-symbols-outlined" style={{ color, background }}>{icon}</span><strong>{department.name}{code ? ` (${code})` : ''}</strong></span>
              <span>{lead ? userName(lead) : 'Not Assigned'}{isManagement && lead?.user_name ? ` (@${lead.user_name})` : ''}</span>
              <span className="team-select-cell"><button type="button" className="team-select-trigger" aria-expanded={openTeamDepartment === department.id} onClick={() => setOpenTeamDepartment(current => current === department.id ? null : department.id)}>Select Team Member <span className="material-symbols-outlined">expand_more</span></button>
                {openTeamDepartment === department.id && <div className="team-select-menu">{candidates.length ? candidates.map(item => {
                  const active = selected.some(person => person.id === item.id)
                  return <button key={item.id} type="button" className={active ? 'active' : ''} onClick={() => { if (item.id !== form.projectManager) toggle('members', item.id) }}><span className="team-member-avatar">{(item.first_name?.[0] || item.user_name?.[0] || '?').toUpperCase()}{(item.last_name?.[0] || '').toUpperCase()}</span><span><strong>{userName(item)}</strong><small>{item.designation || item.role_link__name || 'Member'}</small></span>{active && <span className="material-symbols-outlined">check</span>}</button>
                }) : <p>No users registered</p>}</div>}</span>
              <span className="team-avatars">{selected.length ? selected.map(item => <span key={item.id} className="team-member-avatar" title={userName(item)}>{(item.first_name?.[0] || item.user_name?.[0] || '?').toUpperCase()}{(item.last_name?.[0] || '').toUpperCase()}</span>) : <em>No members assigned</em>}</span>
            </div>
          })}</div>}
      </section>
    </div>}

    {step === 3 && <div className="milestone-step">
      <div className="project-card-heading project-section-heading"><h2>Milestone and features</h2><p>Define critical dates, phases, and features for your project timeline. Adding at least one milestone and one feature is compulsory.</p></div>
      {errors.milestones && <p className="project-error">{errors.milestones}</p>}
      <section className="project-card milestone-add-card" id="milestone-add-form">
        <div className="project-card-heading"><h2>Add Milestone and feature</h2><p>Define a new milestone and feature.</p></div>
        <Field label="Milestone *"><input maxLength={100} placeholder="e.g. AP028" value={milestoneDraft.name} onChange={event => setMilestoneDraft(current => ({ ...current, name: event.target.value }))} /></Field>
        <Field label="Description (optional)"><textarea rows={3} maxLength={500} placeholder="Describe this milestone" value={milestoneDraft.description} onChange={event => setMilestoneDraft(current => ({ ...current, description: event.target.value }))} /></Field>
        <div className="project-grid two"><Field label="Start date *"><input type="date" min={form.startDate} max={milestoneDraft.dueDate || form.endDate} value={milestoneDraft.startDate} onChange={event => setMilestoneDraft(current => ({ ...current, startDate: event.target.value }))} /></Field><Field label="End date *"><input type="date" min={milestoneDraft.startDate || form.startDate} max={form.endDate} value={milestoneDraft.dueDate} onChange={event => setMilestoneDraft(current => ({ ...current, dueDate: event.target.value }))} /></Field></div>
        <div className="project-form-actions"><button type="button" className="project-secondary" onClick={resetMilestoneDraft}>Cancel</button><button type="button" className="project-primary" onClick={saveMilestoneDraft}>{editingMilestoneKey ? 'Update Milestone' : '+ Add Milestone'}</button></div>
      </section>
      <div className="milestone-list">{form.milestones.map((milestone) => {
        const expanded = expandedMilestones[milestone.key] !== false
        return <article className="project-card milestone-summary-card" key={milestone.key}>
          <div className="milestone-summary"><div><h3>{milestone.name || 'Unnamed milestone'}</h3><p><span className="material-symbols-outlined">calendar_month</span>{formatDate(milestone.startDate)} – {formatDate(milestone.dueDate)}</p></div><div className="milestone-actions"><button type="button" title="Edit milestone" onClick={() => editMilestone(milestone)}><span className="material-symbols-outlined">edit</span></button><button type="button" title="Delete milestone" onClick={() => removeMilestone(milestone.key)}><span className="material-symbols-outlined">delete</span></button><button type="button" title="Expand milestone" onClick={() => setExpandedMilestones(current => ({ ...current, [milestone.key]: !expanded }))}><span className="material-symbols-outlined">{expanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}</span></button></div></div>
          {expanded && <div className="milestone-features"><div className="project-row-heading"><h3>Features ({milestone.features.length})</h3><button type="button" onClick={() => patchMilestone(milestone.key, { features: [...milestone.features, featureItem()] })}>+ Add feature</button></div>
            {!milestone.features.length && <div className="project-empty-state"><span className="material-symbols-outlined">view_kanban</span><strong>No features added</strong><p>Add at least one feature to this milestone.</p></div>}
            {milestone.features.map((feature, featureIndex) => <div className="project-feature" key={feature.key}>
              <div className="project-row-heading"><strong>Feature {featureIndex + 1}</strong><button type="button" onClick={() => removeFeature(milestone.key, feature.key)}>Remove</button></div>
              <div className="project-grid two"><Field label="Feature name *"><input value={feature.name} onChange={event => patchFeature(milestone.key, feature.key, { name: event.target.value })} /></Field><Field label="Description"><input value={feature.description} onChange={event => patchFeature(milestone.key, feature.key, { description: event.target.value })} /></Field></div>
              <div className="project-grid two"><Field label="Start date"><input type="date" min={milestone.startDate} max={feature.dueDate || milestone.dueDate} value={feature.startDate} onChange={event => patchFeature(milestone.key, feature.key, { startDate: event.target.value })} /></Field><Field label="Due date"><input type="date" min={feature.startDate || milestone.startDate} max={milestone.dueDate} value={feature.dueDate} onChange={event => patchFeature(milestone.key, feature.key, { dueDate: event.target.value })} /></Field></div>
              <div className="project-grid two"><Field label="Priority"><select value={feature.priority} onChange={event => patchFeature(milestone.key, feature.key, { priority: event.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field><Field label="Status"><select value={feature.status} onChange={event => patchFeature(milestone.key, feature.key, { status: event.target.value })}><option value="pending">Pending</option><option value="in_progress">In progress</option><option value="done">Done</option></select></Field></div>
            </div>)}
          </div>}
        </article>
      })}</div>
    </div>}

    {step === 4 && <div className="sprint-step">
      <div className="sprint-summary-bar"><div><span>Sprint Cycle</span><strong>{form.sprints.length || '—'}</strong><small>+ {form.sprintDuration} days buffer</small></div><div><span>Completion dates</span><strong>{formatDate(form.endDate)}</strong></div><div><span>Committed Points</span><strong>{form.sprints.reduce((total, sprint) => total + sprintWorkingDays(sprint) * Number(form.pointsPerDay || 0), 0)} pts</strong></div><div><span>Buffer days</span><strong>0</strong></div></div>
      <section className="sprint-config-card"><h2>Project timeline</h2>
        <div className="project-grid four"><Field label="Sprint start *"><input type="date" value={form.startDate} onChange={event => field('startDate', event.target.value)} /></Field><Field label="Sprint end *"><input type="date" value={form.endDate} onChange={event => field('endDate', event.target.value)} /></Field><Field label="Duration *"><input type="number" min="1" value={form.sprintDuration} onChange={event => field('sprintDuration', event.target.value)} /></Field><Field label="Points per day *"><div className="points-control"><button type="button" onClick={() => field('pointsPerDay', Math.max(1, Number(form.pointsPerDay) - 1))}>−</button><strong>{form.pointsPerDay}</strong><button type="button" onClick={() => field('pointsPerDay', Number(form.pointsPerDay) + 1)}>+</button></div></Field></div>
      </section>
      <section className="sprint-config-card"><h2>Holidays</h2><p>select your weekends days</p>
        <div className="weekend-buttons">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, visibleIndex) => { const index = (visibleIndex + 1) % 7; return <button key={day} type="button" className={form.weekendDays.includes(index) ? 'active' : ''} onClick={() => field('weekendDays', form.weekendDays.includes(index) ? form.weekendDays.filter(item => item !== index) : [...form.weekendDays, index])}>{day}</button> })}</div>
        <div className="holiday-picker"><div><h3>Select Holidays to Exclude</h3><p>Weekends are off automatically — add any other holiday.</p><div className="project-holidays"><Field label="Holiday date"><input type="date" min={form.startDate} max={form.endDate} value={holidayDate} onChange={event => setHolidayDate(event.target.value)} /></Field><button className="project-secondary" type="button" onClick={() => { if (holidayDate && !form.holidays.includes(holidayDate)) field('holidays', [...form.holidays, holidayDate].sort()); setHolidayDate('') }}>Add holiday</button></div></div><div className="holiday-list"><h3>Selected Holidays</h3>{form.holidays.length ? form.holidays.map(day => <button key={day} type="button" onClick={() => field('holidays', form.holidays.filter(item => item !== day))}><span>{formatDate(day)}</span><span>×</span></button>) : <p>No holidays selected</p>}</div></div>
      </section>
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
    </div>}

    {step === 5 && <div className="task-creation-step"><div className="project-card-heading project-section-heading"><h2>Create Tasks</h2><p>Assign work to project members and connect tasks to sprints and features.</p></div>
      {errors.tasks && <p className="project-error">{errors.tasks}</p>}
      <div className="project-grid task-step"><section className="project-card task-form-card"><div className="project-card-heading"><h2>Task Details</h2><p>Provide the task information and assignment.</p></div>
        <Field label="Task name *"><input maxLength={100} value={taskDraft.name} placeholder="Task name" onChange={event => setTaskDraft(current => ({ ...current, name: event.target.value }))} /></Field>
        <Field label="Description"><textarea rows={3} value={taskDraft.description} onChange={event => setTaskDraft(current => ({ ...current, description: event.target.value }))} /></Field>
        <div className="project-grid two"><Field label="Start date"><input type="date" min={form.startDate} max={taskDraft.dueDate || form.endDate} value={taskDraft.startDate} onChange={event => setTaskDraft(current => ({ ...current, startDate: event.target.value }))} /></Field><Field label="Due date"><input type="date" min={taskDraft.startDate || form.startDate} max={form.endDate} value={taskDraft.dueDate} onChange={event => setTaskDraft(current => ({ ...current, dueDate: event.target.value }))} /></Field></div>
        <div className="project-grid three"><Field label="Sprint"><select value={taskDraft.sprintKey} onChange={event => setTaskDraft(current => ({ ...current, sprintKey: event.target.value }))}><option value="">No sprint</option>{form.sprints.map(sprint => <option key={sprint.key} value={sprint.key}>{sprint.name}</option>)}</select></Field><Field label="Feature"><select value={taskDraft.featureKey} onChange={event => setTaskDraft(current => ({ ...current, featureKey: event.target.value }))}><option value="">No feature</option>{allFeatures.map(feature => <option key={feature.key} value={feature.key}>{feature.name || 'Unnamed feature'}</option>)}</select></Field><Field label="Priority"><select value={taskDraft.priority} onChange={event => setTaskDraft(current => ({ ...current, priority: event.target.value }))}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field></div>
        <div className="project-grid two"><Field label="Assigned to *"><SelectUser users={selectedUsers} value={taskDraft.assignee} onChange={value => setTaskDraft(current => ({ ...current, assignee: value }))} /></Field><Field label="Reviewer"><SelectUser users={selectedUsers} value={taskDraft.reviewer} onChange={value => setTaskDraft(current => ({ ...current, reviewer: value }))} optional /></Field></div>
        <div className="project-form-actions left"><button type="button" className="project-primary" onClick={saveTaskDraft}><span className="material-symbols-outlined">add</span>{editingTaskKey ? 'Update task' : 'Create task'}</button>{editingTaskKey && <button type="button" className="project-secondary" onClick={resetTaskDraft}>Cancel edit</button>}</div>
      </section>
      <div className="task-side-column"><section className="project-card task-added-card"><div className="task-added-heading"><h2>Task added</h2><span>{form.tasks.length}</span></div>
        {!form.tasks.length ? <div className="project-empty-state"><span className="material-symbols-outlined">assignment</span><strong>No tasks added yet</strong><p>Fill out the task form and create a task to view it here.</p></div> : <div className="task-added-list">{form.tasks.map(task => <article key={task.key}><div className="project-row-heading"><h3>{task.name}</h3><div><button type="button" onClick={() => editTask(task)}>Edit</button><button type="button" onClick={() => removeTask(task.key)}>Remove</button></div></div><dl><dt>Description</dt><dd>{task.description || '—'}</dd><dt>Sprint</dt><dd>{form.sprints.find(sprint => sprint.key === task.sprintKey)?.name || 'Not assigned'}</dd><dt>Reviewer</dt><dd>{userName(options.users.find(item => item.id === task.reviewer) || {}) || 'Not assigned'}</dd><dt>Assignee</dt><dd>{userName(options.users.find(item => item.id === task.assignee) || {}) || 'Not assigned'}</dd></dl><button className="project-text-button" type="button" onClick={() => field('dependencies', [...form.dependencies, dependencyItem(task.key)])}>+ Add dependency</button></article>)}</div>}
      </section></div></div>
      <section className="project-card project-dependencies"><div className="project-card-heading"><h2>Dependencies</h2><p>Track blockers for the tasks in this project.</p></div>
      {form.dependencies.map((dependency, index) => <article className="project-nested-card" key={dependency.key}>
        <div className="project-row-heading"><h3>Dependency {index + 1}</h3><button type="button" onClick={() => field('dependencies', form.dependencies.filter(item => item.key !== dependency.key))}>Remove</button></div>
        <Field label="Task"><select value={dependency.taskKey} onChange={event => patchItem('dependencies', dependency.key, { taskKey: event.target.value })}><option value="">Select task</option>{form.tasks.map(task => <option key={task.key} value={task.key}>{task.name || 'Unnamed task'}</option>)}</select></Field>
        <Field label="Depends on"><select value={dependency.dependsOnKey} onChange={event => patchItem('dependencies', dependency.key, { dependsOnKey: event.target.value })}><option value="">No linked task</option>{form.tasks.filter(task => task.key !== dependency.taskKey).map(task => <option key={task.key} value={task.key}>{task.name || 'Unnamed task'}</option>)}</select></Field>
        <Field label="Description *"><textarea rows={2} value={dependency.description} onChange={event => patchItem('dependencies', dependency.key, { description: event.target.value })} /></Field>
        <Field label="Assigned to"><SelectUser users={selectedUsers} value={dependency.assignee} onChange={value => patchItem('dependencies', dependency.key, { assignee: value })} optional /></Field>
        <Field label="Due date"><input type="date" value={dependency.dueDate} onChange={event => patchItem('dependencies', dependency.key, { dueDate: event.target.value })} /></Field>
      </article>)}
      {!form.dependencies.length && <p className="project-hint">Add a dependency from a task if it has a blocker.</p>}
      </section>
    </div>}

    <footer className="project-editor-actions"><div>{step === 0 ? <Link to="/projects" className="project-secondary">Cancel</Link> : <button type="button" className="project-secondary" onClick={() => setStep(value => value - 1)}>Back</button>}</div>
      <div>{!projectId && <button type="button" className="project-secondary" onClick={saveDraft}>Save &amp; Continue later</button>}
        {step < lastStep ? <button type="button" className="project-primary" onClick={goNext}>Next <span className="material-symbols-outlined">arrow_forward</span></button> :
          <button type="button" className="project-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : projectId ? 'Update Project' : 'Create Project'}</button>}
      </div></footer>
    </div>
  </div>
}
