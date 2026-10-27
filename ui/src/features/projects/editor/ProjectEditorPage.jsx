import { Children, cloneElement, Fragment, isValidElement, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../../services/api/apiClient.js'
import { roleSlug } from '../../../utils/roles.js'
import { useProjectSelection } from '../../../app/hooks/index.js'
import { createProject, projectFiles, projectOptions, projectSetup, updateProject } from './projectApi.js'
import DatePicker from '../../../components/common/DatePicker.jsx'
import { assignTaskToSprint, fileLimit, isManagerOption, validateFeature, validateProject, syncProjectSprints } from './projectValidation.js'

import './projectEditor.css'

const steps = ['Project Information', 'PDR & Resources', 'Departments & Team',
  'Milestones & Features', 'Configure Sprint', 'Create Tasks']
const stepTitles = ['Project information', 'PDR & resources', 'Departments & Team', 'Milestone and features', 'Configure Sprint', 'Create Tasks']
const breadcrumbs = ['Project information', 'Upload documents', 'Team setup', 'project milestones', 'Sprint configuration', 'Create tasks']
const projectTypes = ['Product Development', 'Client Project', 'Internal Tool', 'Research', 'Maintenance']
const DRAFT_KEY = 'pm_create_project_draft'
const key = () => crypto.randomUUID()
const empty = () => ({
  projectCode: '', projectName: '', description: '', customer: '', projectManager: '',
  priority: 'medium', projectType: '', startDate: '', endDate: '',
  links: [], files: [], pdrVersion: 'V1.0', pdrChangelog: '', departments: [], members: [],
  milestones: [], sprints: [], tasks: [], dependencies: [], pointsPerDay: 2,
  sprintStartDate: '', sprintEndDate: '', sprintDuration: 14, weekendDays: [0, 6], holidays: [],
})
const milestoneItem = () => ({ key: key(), name: '', description: '', startDate: '', dueDate: '', features: [] })
const featureItem = () => ({ key: key(), name: '', description: '', startDate: '', dueDate: '', status: 'pending', priority: 'medium' })
const taskItem = () => ({ key: key(), name: '', description: '', startDate: '', dueDate: '', priority: 'medium',
  assignee: '', reviewer: '', sprintKey: '', milestoneKey: '', featureKey: '', dependencyType: '' })
const dependencyItem = (taskKey = '') => ({ key: key(), taskKey, dependsOnKey: '', description: '', dependencyType: 'optional', assignee: '', dueDate: '' })
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
    id: milestone.id, key: String(milestone.id), name: milestone.name || '',
    description: milestone.description || '', startDate: dateOnly(milestone.start_date),
    dueDate: dateOnly(milestone.due_date),
    features: (milestone.features || []).map(feature => ({
      id: feature.id, key: String(feature.id), name: feature.feature_name || '',
      description: feature.description || '', startDate: dateOnly(feature.feature_start_date),
      dueDate: dateOnly(feature.feature_due_date), status: feature.feature_status || 'pending',
      priority: feature.feature_priority || 'medium',
    })),
  }))
  const sprints = (project.sprints || []).map(sprint => ({
    id: sprint.id, key: String(sprint.id), number: sprint.Sprint_No || '', name: sprint.Sprint_Name || '',
    startDate: dateOnly(sprint.Sprint_start_date), endDate: dateOnly(sprint.Sprint_end_date),
    excludeWeekends: sprint.exclude_weekends ?? true, members: sprint.team_members || [],
    offDays: (sprint.off_days || []).map(dateOnly),
  }))
  const tasks = (project.tasks || []).map(task => {
    let priority = 'medium'
    let milestoneId = ''
    try { const metadata = JSON.parse(task.Remarks || '{}'); priority = metadata.priority || 'medium'; milestoneId = metadata.milestone_id || '' } catch { /* existing free text */ }
    return {
      id: task.id, key: String(task.id), name: task.Task_Name || '', description: task.description || '',
      startDate: dateOnly(task.planned_start_date), dueDate: dateOnly(task.Due_Date), priority,
      remarksRaw: task.Remarks || '', originalPriority: priority,
      assignee: task.assigned_to || '', reviewer: task.review_by || '',
      sprintKey: sprints.find(sprint => String(sprint.id) === String(task.sprint))?.key || '',
      milestoneKey: milestones.find(milestone => String(milestone.id) === String(milestoneId) || milestone.features.some(feature => String(feature.id) === String(task.feature)))?.key || '',
      featureKey: milestones.flatMap(milestone => milestone.features).find(feature => String(feature.id) === String(task.feature))?.key || '',
      dependencyType: (project.dependencies || []).find(item => String(item.task) === String(task.id))?.dependency_type || '',
    }
  })
  return {
    projectCode: project.project_code || '', projectName: project.project_name || '',
    description: project.description || '', customer: project.customer_name || '',
    projectManager: project.project_managers?.[0] || '', priority: project.priority_name || 'medium',
    projectType: (project.project_type_name || '').toLowerCase(), startDate: dateOnly(project.start_date),
    endDate: dateOnly(project.end_date), links: project.resource_links || [],
    files: files.map(file => ({ ...file, key: file.id })),
    pdrVersion: files.find(file => file.is_pdr)?.pdr_version || 'V1.0',
    pdrChangelog: files.find(file => file.is_pdr)?.pdr_changelog || '',
    departments: project.departments || [], members: project.team_members || [],
    milestones, sprints, tasks,
    dependencies: (project.dependencies || []).map(dependency => ({
      id: dependency.id, key: String(dependency.id),
      taskKey: tasks.find(task => task.id === dependency.task)?.key || '',
      dependsOnKey: tasks.find(task => task.id === dependency.depends_on)?.key || '',
      taskId: dependency.task, dependsOnId: dependency.depends_on,
      description: dependency.description || '', dependencyType: dependency.dependency_type || 'optional',
      assignee: dependency.assigned_to || '',
      dueDate: dateOnly(dependency.due_date),
    })),
    pointsPerDay: project.points_per_working_day || 2,
    sprintDuration: sprints.length ? Math.max(1, sprintWorkingDays(sprints[0])) : 14,
    weekendDays: sprints[0]?.excludeWeekends === false ? [] : [0, 6],
    holidays: [...new Set(sprints.flatMap(sprint => sprint.offDays))],
  }
}


function Field({ label, children, error, hint }) {
  const id = useId()
  const required = label.endsWith(' *')
  return <div className="project-field"><label htmlFor={id}>{required ? label.slice(0, -2) : label}{required && <span className="project-required"> *</span>}</label>
    {Children.map(children, (child, index) => index === 0 && isValidElement(child) ? cloneElement(child, { id }) : child)}
    {error && <small role="alert" className="project-error">{error}</small>}
    {!error && hint && <small className="project-hint">{hint}</small>}
  </div>
}

function SelectUser({ id, value, onChange, users, placeholder = 'Select team member', optional = false }) {
  const selected = users.find(user => String(user.id) === String(value))
  return <div className="project-user-select">
    {selected && <span className="project-user-avatar" aria-hidden="true">{(selected.first_name?.[0] || selected.user_name?.[0] || '?').toUpperCase()}{selected.last_name?.[0]?.toUpperCase()}</span>}
    <select id={id} className={selected ? 'has-avatar' : ''} value={value} onChange={event => onChange(event.target.value)}>
    <option value="">{optional ? 'None' : placeholder}</option>
    {users.map(user => <option key={user.id} value={user.id}>{userName(user)}</option>)}
    </select>
  </div>
}

export default function ProjectEditorPage({ user }) {
  const { projectId } = useParams()
  const localNow = new Date()
  const today = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, '0')}-${String(localNow.getDate()).padStart(2, '0')}`
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
  const [holidayMonth, setHolidayMonth] = useState(() => new Date())
  const [openTeamDepartment, setOpenTeamDepartment] = useState(null)
  const [milestoneDraft, setMilestoneDraft] = useState(milestoneItem)
  const [editingMilestoneKey, setEditingMilestoneKey] = useState(null)
  const [expandedMilestones, setExpandedMilestones] = useState({})
  const [featureEditor, setFeatureEditor] = useState(null)
  const [taskDraft, setTaskDraft] = useState(taskItem)
  const [editingTaskKey, setEditingTaskKey] = useState(null)
  const [taskDependencies, setTaskDependencies] = useState([])
  const dependencyDialog = useRef(null)
  const [dependencyDraft, setDependencyDraft] = useState(dependencyItem)
  const [dependencyError, setDependencyError] = useState('')
  const canCreateChildren = roleSlug(user?.role) === 'admin' || ['Milestones', 'Features', 'Tasks'].every(
    module => user?.permissions?.[module]?.Create === true,
  )
  const projectOnlyCreation = !projectId && !canCreateChildren
  const visibleSteps = projectOnlyCreation ? steps.slice(0, 3) : steps
  const lastStep = visibleSteps.length - 1
  const draftKey = `${DRAFT_KEY}:${user?.id || 'anonymous'}`
  const managerOptions = (options.project_managers || options.users).filter(isManagerOption)
  const selectedUsers = useMemo(() => options.users.filter(person => form.members.some(id => String(id) === String(person.id)) || String(person.id) === String(form.projectManager) || String(person.id) === String(user?.id)), [options.users, form.members, form.projectManager, user?.id])
  const departments = useMemo(() => [...options.departments].sort((a, b) => {
    const aIndex = departmentOrder.indexOf(a.name)
    const bIndex = departmentOrder.indexOf(b.name)
    return (aIndex < 0 ? departmentOrder.length : aIndex) - (bIndex < 0 ? departmentOrder.length : bIndex) || a.name.localeCompare(b.name)
  }), [options.departments])

  useEffect(() => {
    let active = true
    Promise.all([projectOptions(projectId), ...(projectId ? [projectSetup(projectId), projectFiles(projectId)] : [])])
      .then(([choices, project, files]) => {
        if (!active) return
        setOptions(choices)
        if (project) {
          const loaded = fromApi(project, files)
          setForm(loaded.sprints.length ? loaded : syncProjectSprints(loaded))
          setInitial(loaded)
          setOriginalFiles(files)
        } else {
          try {
            const draft = JSON.parse(localStorage.getItem(draftKey))
            if (draft) setForm(current => syncProjectSprints({ ...current, ...draft, files: [] }))
          } catch { localStorage.removeItem(draftKey) }
        }
      })
      .catch(error => { if (active) setMessage(readableError(error)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [draftKey, projectId])

  const field = (name, value) => {
    if (name === 'weekendDays' && (value.length === 0 || value.length === 7)) {
      setMessage('Choose at least one weekend day and keep at least one working day.')
      return
    }
    const next = { ...form, [name]: value }
    if (name === 'members') {
      setForm({ ...next, sprints: form.sprints.map(sprint => ({ ...sprint, members: [...value] })) })
      return
    }
    if (name === 'startDate') next.sprintStartDate = ''
    if (name === 'endDate') next.sprintEndDate = ''
    if (['startDate', 'endDate', 'sprintStartDate', 'sprintEndDate', 'sprintDuration', 'weekendDays', 'holidays'].includes(name)) {
      const updated = syncProjectSprints(next)
      setForm(updated)
      setTaskDraft(current => assignTaskToSprint(current, updated.sprints))
      setErrors(current => ({ ...current, sprints: '' }))
      setMessage('')
    } else setForm(next)
  }
  const removeTask = taskKey => {
    setForm(current => ({
      ...current, tasks: current.tasks.filter(task => task.key !== taskKey),
      dependencies: current.dependencies.filter(dep => dep.taskKey !== taskKey && dep.dependsOnKey !== taskKey),
    }))
    if (taskDraft.key === taskKey) { setTaskDraft(taskItem()); setEditingTaskKey(null); setTaskDependencies([]) }
  }
  const openFeatureEditor = (milestone, feature) => setFeatureEditor({
    milestoneKey: milestone.key, editingKey: feature?.key || null, error: '',
    draft: feature ? { ...feature } : { ...featureItem(), startDate: milestone.startDate < today ? today : milestone.startDate, dueDate: milestone.dueDate },
  })
  const saveFeatureDraft = () => {
    const milestone = form.milestones.find(item => item.key === featureEditor.milestoneKey)
    if (!milestone) return
    const original = milestone.features.find(item => item.key === featureEditor.editingKey)
    const error = validateFeature(featureEditor.draft, milestone, { today, original })
    if (error) { setFeatureEditor(current => ({ ...current, error })); return }
    const feature = { ...featureEditor.draft, name: featureEditor.draft.name.trim() }
    setForm(current => ({ ...current, milestones: current.milestones.map(item => item.key === milestone.key ? {
      ...item, features: featureEditor.editingKey
        ? item.features.map(saved => saved.key === featureEditor.editingKey ? { ...saved, ...feature } : saved)
        : [...item.features, feature],
    } : item) }))
    setErrors(current => ({ ...current, milestones: '' }))
    setFeatureEditor(null)
  }
  const removeMilestone = milestoneKey => {
    setForm(current => {
      const keys = new Set(current.milestones.find(item => item.key === milestoneKey)?.features.map(feature => feature.key))
      return { ...current, milestones: current.milestones.filter(item => item.key !== milestoneKey),
        tasks: current.tasks.map(task => keys.has(task.featureKey) ? { ...task, featureKey: '' } : task) }
    })
    if (editingMilestoneKey === milestoneKey) { setMilestoneDraft(milestoneItem()); setEditingMilestoneKey(null) }
    if (featureEditor?.milestoneKey === milestoneKey) setFeatureEditor(null)
  }
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
    if (milestoneDraft.startDate < form.startDate || milestoneDraft.dueDate > form.endDate) {
      setErrors(current => ({ ...current, milestones: 'Milestone dates must be within the project dates.' }))
      return
    }
    const existing = form.milestones.find(item => item.key === editingMilestoneKey)
    if (existing?.features.some(feature => (feature.startDate && feature.startDate < milestoneDraft.startDate) || (feature.dueDate && feature.dueDate > milestoneDraft.dueDate))) {
      setErrors(current => ({ ...current, milestones: 'Milestone dates must include all of its features. Update the feature dates first.' }))
      return
    }
    const savedKey = editingMilestoneKey || key()
    setForm(current => ({ ...current, milestones: editingMilestoneKey
      ? current.milestones.map(item => item.key === editingMilestoneKey ? { ...item, ...milestoneDraft, key: item.key, features: item.features } : item)
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
  const resetTaskDraft = () => {
    setTaskDraft(taskItem()); setEditingTaskKey(null); setTaskDependencies([])
  }
  const openDependencyDialog = () => {
    setDependencyDraft({ ...dependencyItem(taskDraft.key), dependencyType: taskDraft.dependencyType || 'optional' })
    setDependencyError('')
    dependencyDialog.current.showModal()
  }
  const saveDependencyDraft = () => {
    if (!dependencyDraft.assignee || !dependencyDraft.dueDate) {
      setDependencyError('Assigned to and due date are required.')
      return
    }
    if (dependencyDraft.dueDate < today) { setDependencyError('Due date cannot be in the past.'); return }
    setTaskDependencies(current => [...current, dependencyDraft])
    dependencyDialog.current.close()
  }
  const saveTaskDraft = () => {
    if (!taskDraft.name.trim() || !taskDraft.sprintKey || !taskDraft.startDate || !taskDraft.dueDate || !taskDraft.assignee) {
      setErrors(current => ({ ...current, tasks: 'Task name, sprint, dates, and assignee are required.' }))
      return
    }
    if (taskDraft.startDate && taskDraft.dueDate && taskDraft.dueDate < taskDraft.startDate) {
      setErrors(current => ({ ...current, tasks: 'Task due date must be after its start date.' }))
      return
    }
    if (taskDraft.reviewer && String(taskDraft.reviewer) === String(taskDraft.assignee)) {
      setErrors(current => ({ ...current, tasks: 'The reviewer and assignee must be different team members.' }))
      return
    }
    const taskErrors = validateProject({ ...form, tasks: [taskDraft], dependencies: [] }, {
      users: options.users, currentUserId: user?.id,
    })
    if (taskErrors.tasks) {
      setErrors(current => ({ ...current, tasks: taskErrors.tasks }))
      return
    }
    setForm(current => ({ ...current, tasks: editingTaskKey
      ? current.tasks.map(item => item.key === editingTaskKey ? { ...item, ...taskDraft, key: item.key } : item)
      : [...current.tasks, { ...taskDraft }],
      dependencies: [...current.dependencies.filter(item => item.taskKey !== taskDraft.key), ...taskDependencies] }))
    setErrors(current => ({ ...current, tasks: '' }))
    resetTaskDraft()
  }
  const editTask = task => {
    setTaskDraft({ ...task }); setEditingTaskKey(task.key)
    setTaskDependencies(form.dependencies.filter(item => item.taskKey === task.key))
  }
  const toggle = (name, id) => field(name, form[name].includes(id) ? form[name].filter(item => item !== id) : [...form[name], id])
  const toggleDepartment = id => setForm(current => {
    if (!current.departments.includes(id)) return { ...current, departments: [...current.departments, id] }
    const departmentUserIds = new Set(options.users.filter(item => item.department_link_id === id).map(item => item.id))
    const members = current.members.filter(userId => !departmentUserIds.has(userId))
    return { ...current, departments: current.departments.filter(item => item !== id),
      members, sprints: current.sprints.map(sprint => ({ ...sprint, members: sprint.members.filter(userId => members.includes(userId)) })) }
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
  const stepFields = [['projectCode', 'projectName', 'description', 'customer', 'projectManager', 'priority', 'projectType', 'startDate', 'endDate'],
    ['links', 'pdrFile', 'pdrVersion', 'resourceFiles'], ['departments'], ['milestones'], ['sprints'], ['tasks']]
  const validateStep = index => {
    if (index === 3 && featureEditor && form.milestones.some(item => item.key === featureEditor.milestoneKey)) {
      setFeatureEditor(current => ({ ...current, error: 'Add or cancel this feature before continuing.' }))
      setMessage('Add or cancel the feature before continuing.')
      return false
    }
    const all = validateProject(form, { projectOnly: projectOnlyCreation, users: options.users, currentUserId: user?.id, today, rejectPastDates: !projectId })
    const found = Object.fromEntries(Object.entries(all).filter(([name]) => stepFields[index]?.includes(name)))
    setErrors(found)
    if (Object.keys(found).length) { setMessage(Object.values(found)[0]); return false }
    setErrors(current => Object.fromEntries(Object.entries(current).filter(([name]) => !stepFields[index]?.includes(name))))
    return true
  }
  const goNext = () => {
    if (validateStep(step)) { setStep(value => Math.min(lastStep, value + 1)); setMessage('') }
  }
  const goToStep = target => {
    if (target <= step) { setStep(target); setMessage(''); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    for (let index = step; index < target; index += 1) {
      if (!validateStep(index)) { setStep(index); return }
    }
    setStep(target)
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const save = async () => {
    if (featureEditor && form.milestones.some(item => item.key === featureEditor.milestoneKey)) {
      setStep(3); setMessage('Add or cancel the feature before saving the project.'); return
    }
    const found = validateProject(form, { projectOnly: projectOnlyCreation, users: options.users, currentUserId: user?.id, today, rejectPastDates: !projectId })
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
      navigate(roleSlug(user?.role) === 'admin' ? '/admin/all-projects' : '/pm/projects', { state: { saved: projectId ? 'Project updated.' : 'Project created.' } })
    } catch (error) {
      setMessage(readableError(error))
    } finally { setSaving(false) }
  }

  const saveDraft = () => {
    const serializable = { ...form, files: [] }
    localStorage.setItem(draftKey, JSON.stringify(serializable))
    setMessage('Draft saved in this browser. You can continue later.')
  }

  const holidayMonthStart = new Date(holidayMonth.getFullYear(), holidayMonth.getMonth(), 1)
  const holidayCalendarStart = new Date(holidayMonthStart)
  holidayCalendarStart.setDate(1 - holidayMonthStart.getDay())
  const holidayCalendarDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(holidayCalendarStart)
    date.setDate(date.getDate() + index)
    return date
  })
  const calendarDateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

  if (loading) return <div className="project-editor"><p>Loading project setup…</p></div>
  return <div className="project-editor">
    <div className="project-breadcrumb"><Link to="/projects">Project</Link>{breadcrumbs.slice(0, step + 1).map((label, index) => <Fragment key={label}><span className="project-breadcrumb-separator">&gt;</span><span className={index === step ? 'current' : ''}>{label}</span></Fragment>)}</div>
    <header className="project-editor-header"><h1>{stepTitles[step]}</h1><p>Step <strong>{step + 1}</strong> of {visibleSteps.length}</p></header>
    <nav className="project-stepper" aria-label="Project setup steps">{visibleSteps.map((label, index) => <Fragment key={label}>
      <button key={label} type="button" className={index === step ? 'active' : index < step ? 'done' : ''}
        onClick={() => goToStep(index)} aria-current={index === step ? 'step' : undefined}>
        <span>{index < step ? '✓' : index + 1}</span><small>{label}</small>
      </button>{index < visibleSteps.length - 1 && <div className={`project-step-connector ${index < step ? 'done' : ''}`} aria-hidden="true" />}</Fragment>)}</nav>
    {message && <div className="project-alert" role="alert">{message}</div>}
    <div className={[1, 3].includes(step) ? 'project-step-shell' : 'project-step-body'}>

    {step === 0 && <div className="project-intro-grid">
      <aside className="project-guide"><div className="project-illustration"><img src="/downloading-data.png" alt="Project setup illustration" /></div>
        <h2>Let's set up your project</h2><p>This wizard will help you create a new project and set the foundation for successful execution.</p>
        <ul>{[['schedule', 'Takes ~10 minutes'], ['edit_note', 'All steps can be reviewed later'], ['save', 'You can save and continue later']].map(([icon, text]) => <li key={icon}><span className="material-symbols-outlined">{icon}</span>{text}</li>)}</ul>
        <div className="project-help"><strong>Need Help?</strong><p>Learn more about project onboarding</p><button type="button" onClick={() => setMessage('Project onboarding: enter project information, upload the PDR, assign departments and team members, then define milestones, sprints and tasks. Save your progress to continue later.')}>View Guide <span className="material-symbols-outlined">arrow_forward</span></button></div>
      </aside>
      <section className="project-card"><div className="project-card-heading"><h2>Project Information</h2><p>Provide basic information about your project.</p></div>
        <div className="project-grid two">
          <Field label="Project code *" error={errors.projectCode} hint="Unique identifier for this project."><input maxLength={10} placeholder="e.g. AP028" value={form.projectCode} onChange={event => field('projectCode', event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))} /></Field>
          <Field label="Project Name *" error={errors.projectName} hint="Unique identifier for this project."><input maxLength={200} placeholder="e.g. Industrial Data Logger" value={form.projectName} onChange={event => field('projectName', event.target.value)} /></Field>
        </div>
        <Field label="Project Description *" error={errors.description} hint="Unique identifier for this project. can be auto-generated"><textarea rows={4} placeholder="Project Description..." value={form.description} onChange={event => field('description', event.target.value)} /></Field>
        <div className="project-grid three">
          <Field label="Customer / Client *" error={errors.customer}><input maxLength={200} placeholder="e.g. Acme Automation" list="project-customers" value={form.customer} onChange={event => field('customer', event.target.value)} /><datalist id="project-customers">{options.customers?.map(item => <option key={item.id} value={item.name} />)}</datalist></Field>
          <Field label="Project Manager *" error={errors.projectManager}><SelectUser value={form.projectManager} onChange={value => field('projectManager', value)} users={managerOptions} placeholder="Select Project Manager" /></Field>
          <Field label="Priority *" error={errors.priority}><select value={form.priority} onChange={event => field('priority', event.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field>
        </div>
        <div className="project-grid three">
          <Field label="Planned Start Date *" error={errors.startDate}><DatePicker value={form.startDate} placeholder="Select start date" onChange={value => field('startDate', value)} style={{ height: 42 }} /></Field>
          <Field label="Planned End Date *" error={errors.endDate}><DatePicker min={form.startDate} value={form.endDate} placeholder="Select end date" onChange={value => field('endDate', value)} style={{ height: 42 }} /></Field>
          <Field label="Project Type *" error={errors.projectType}><select value={form.projectType} onChange={event => field('projectType', event.target.value)}><option value="">Select</option>{projectTypes.map(type => <option key={type} value={type.toLowerCase()}>{type}</option>)}{form.projectType && !projectTypes.some(type => type.toLowerCase() === form.projectType) && <option value={form.projectType}>{form.projectType[0].toUpperCase() + form.projectType.slice(1)}</option>}</select></Field>
        </div>
        <div className="project-info-strip project-settings-note"><span className="material-symbols-outlined">info</span><p>You will be able to modify these details later from project settings.</p></div>
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
        <div className="project-grid two"><Field label="Start date *"><DatePicker placeholder="Select start date" style={{ height: 42 }} min={form.startDate} max={milestoneDraft.dueDate || form.endDate} value={milestoneDraft.startDate} onChange={value => setMilestoneDraft(current => ({ ...current, startDate: value }))} /></Field><Field label="End date *"><DatePicker placeholder="Select end date" style={{ height: 42 }} min={milestoneDraft.startDate || form.startDate} max={form.endDate} value={milestoneDraft.dueDate} onChange={value => setMilestoneDraft(current => ({ ...current, dueDate: value }))} /></Field></div>
        <div className="project-form-actions"><button type="button" className="project-secondary" onClick={resetMilestoneDraft}>Cancel</button><button type="button" className="project-primary" onClick={saveMilestoneDraft}>{editingMilestoneKey ? 'Update Milestone' : '+ Add Milestone'}</button></div>
      </section>
      <div className="milestone-list">{form.milestones.map((milestone) => {
        const expanded = expandedMilestones[milestone.key] !== false
        return <article className="project-card milestone-summary-card" key={milestone.key}>
          <div className="milestone-summary"><div><h3>{milestone.name || 'Unnamed milestone'}</h3><p><span className="material-symbols-outlined">calendar_month</span>{formatDate(milestone.startDate)} – {formatDate(milestone.dueDate)}</p></div><div className="milestone-actions"><button type="button" title="Edit milestone" onClick={() => editMilestone(milestone)}><span className="material-symbols-outlined">edit</span></button><button type="button" title="Delete milestone" onClick={() => removeMilestone(milestone.key)}><span className="material-symbols-outlined">delete</span></button><button type="button" title="Expand milestone" onClick={() => setExpandedMilestones(current => ({ ...current, [milestone.key]: !expanded }))}><span className="material-symbols-outlined">{expanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}</span></button></div></div>
          {expanded && <div className="milestone-features">
            {milestone.features.map((feature, featureIndex) => <div className="feature-summary" key={feature.key}>
              <span className="feature-index">F{featureIndex + 1}</span><div className="feature-summary-copy"><strong>{feature.name}</strong><small><span className="material-symbols-outlined">calendar_month</span>{formatDate(feature.startDate)} – {formatDate(feature.dueDate)}</small></div>
              <div className="milestone-actions"><button type="button" title="Edit feature" onClick={() => openFeatureEditor(milestone, feature)}><span className="material-symbols-outlined">edit</span></button><button type="button" title="Delete feature" onClick={() => { removeFeature(milestone.key, feature.key); if (featureEditor?.editingKey === feature.key) setFeatureEditor(null) }}>×</button></div>
            </div>)}
            {featureEditor?.milestoneKey === milestone.key && <div className="feature-form">
              <Field label="Feature *"><input maxLength={200} placeholder="AP028" value={featureEditor.draft.name} onChange={event => setFeatureEditor(current => ({ ...current, draft: { ...current.draft, name: event.target.value } }))} /></Field>
              <Field label="Start date *"><DatePicker placeholder="Select start date" style={{ height: 42 }} min={milestone.startDate} max={featureEditor.draft.dueDate || milestone.dueDate} value={featureEditor.draft.startDate} onChange={value => setFeatureEditor(current => ({ ...current, draft: { ...current.draft, startDate: value } }))} /></Field>
              <Field label="End date *"><DatePicker placeholder="Select end date" style={{ height: 42 }} min={featureEditor.draft.startDate || milestone.startDate} max={milestone.dueDate} value={featureEditor.draft.dueDate} onChange={value => setFeatureEditor(current => ({ ...current, draft: { ...current.draft, dueDate: value } }))} /></Field>
              <button type="button" className="project-secondary" onClick={() => setFeatureEditor(null)}>Cancel</button><button type="button" className="project-primary" onClick={saveFeatureDraft}>{featureEditor.editingKey ? 'Update feature' : '+ Add feature'}</button>
              {featureEditor.error && <p className="project-error" role="alert">{featureEditor.error}</p>}
            </div>}
            <button type="button" className="feature-add-trigger" onClick={() => openFeatureEditor(milestone)}>+ Add feature</button>
          </div>}
        </article>
      })}</div>
    </div>}

    {step === 4 && <div className="sprint-step">
      <div className="sprint-summary-bar"><div><span>Sprint Cycle</span><strong>{form.sprints.length}</strong><small>+ {form.sprintDuration} days buffer</small></div><div><span>Completion dates</span><strong>{formatDate(form.sprintEndDate || form.endDate)}</strong></div><div><span>Committed Points</span><strong>{form.sprints.reduce((total, sprint) => total + sprintWorkingDays(sprint) * Number(form.pointsPerDay || 0), 0)} pts</strong></div><div><span>Buffer days</span><strong>{(form.sprints.reduce((total, sprint) => total + sprintWorkingDays(sprint), 0) % (Number(form.sprintDuration) || 1)).toFixed(1)} working days</strong></div></div>
      <section className="sprint-config-card"><h2>Project timeline</h2>
        <div className="project-grid four"><Field label="Start date *"><DatePicker min={form.startDate} max={form.sprintEndDate || form.endDate} placeholder="Select start date" style={{ height: 42 }} value={form.sprintStartDate || form.startDate} onChange={value => field('sprintStartDate', value)} /></Field><Field label="Target end date *"><DatePicker min={form.sprintStartDate || form.startDate} max={form.endDate} placeholder="Select end date" style={{ height: 42 }} value={form.sprintEndDate || form.endDate} onChange={value => field('sprintEndDate', value)} /></Field><Field label="Sprint duration (days) *"><input type="text" inputMode="numeric" value={form.sprintDuration ? `${form.sprintDuration} days` : ''} placeholder="e.g. 5 days" onChange={event => field('sprintDuration', event.target.value.replace(/[^0-9]/g, ''))} /></Field><Field label="Points per day *"><div className="points-control"><button type="button" onClick={() => field('pointsPerDay', Math.max(1, Number(form.pointsPerDay) - 1))}>−</button><strong>{form.pointsPerDay}</strong><button type="button" onClick={() => field('pointsPerDay', Number(form.pointsPerDay) + 1)}>+</button></div></Field></div>
      </section>
      <section className="sprint-config-card"><h2>Holidays</h2><p>select your weekends days</p>
        <div className="weekend-buttons">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, visibleIndex) => { const index = (visibleIndex + 1) % 7; return <button key={day} type="button" className={form.weekendDays.includes(index) ? 'active' : ''} onClick={() => field('weekendDays', form.weekendDays.includes(index) ? form.weekendDays.filter(item => item !== index) : [...form.weekendDays, index])}>{day}</button> })}</div>
        <h3 className="holiday-select-heading">Select Holidays to Exclude</h3><p className="holiday-caption">Weekends are off automatically — tap any other day to mark a holiday.</p>
        <div className="holiday-picker"><div className="holiday-calendar"><div className="holiday-calendar-heading"><button type="button" aria-label="Previous month" onClick={() => setHolidayMonth(new Date(holidayMonth.getFullYear(), holidayMonth.getMonth() - 1, 1))}>‹</button><strong>{holidayMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong><button type="button" aria-label="Next month" onClick={() => setHolidayMonth(new Date(holidayMonth.getFullYear(), holidayMonth.getMonth() + 1, 1))}>›</button></div><div className="holiday-calendar-grid">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => <span className="weekday" key={day}>{day}</span>)}{holidayCalendarDays.map(date => { const value = calendarDateKey(date); const selected = form.holidays.includes(value); const outOfRange = value < today || (form.startDate && value < form.startDate) || (form.endDate && value > form.endDate); return <button key={value} type="button" disabled={outOfRange || form.weekendDays.includes(date.getDay())} className={`${date.getMonth() === holidayMonth.getMonth() ? '' : 'outside'} ${selected ? 'selected' : ''} ${form.weekendDays.includes(date.getDay()) ? 'weekend' : ''}`} onClick={() => field('holidays', selected ? form.holidays.filter(item => item !== value) : [...form.holidays, value].sort())}>{date.getDate()}</button> })}</div></div><div className="holiday-list"><h3>Marked Holidays</h3>{form.holidays.length ? form.holidays.map(day => <button key={day} type="button" onClick={() => field('holidays', form.holidays.filter(item => item !== day))}><span>{formatDate(day)}</span><span>×</span></button>) : <p>No holidays marked yet.<br />Tap any weekday on the calendar to mark a holiday.</p>}</div></div>
      </section>
      {form.sprints.length > 0 && <section className="sprint-roadmap-card"><h2>Active Roadmap: {form.projectName || 'Project'}</h2>
        <div className="sprint-roadmap-table-wrap"><table className="sprint-roadmap-table"><thead><tr><th>Sprint No.</th><th>Date</th><th>Working Days</th><th>Sprint Points</th></tr></thead><tbody>
          {form.sprints.map((sprint, index) => <Fragment key={sprint.key}>
            {form.sprints.length > 6 && index === 4 && <tr><td colSpan={4} className="sprint-roadmap-more">••• ({form.sprints.length - 6} more sprints) •••</td></tr>}
            {(form.sprints.length <= 6 || index < 4 || index >= form.sprints.length - 2) && <tr><td><strong>{sprint.name}</strong></td><td>{new Date(`${sprint.startDate}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {new Date(`${sprint.endDate}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td><td><strong>{sprintWorkingDays(sprint)} days</strong></td><td className="sprint-roadmap-points">{sprintWorkingDays(sprint) * Number(form.pointsPerDay || 0)} points</td></tr>}
          </Fragment>)}
        </tbody></table></div>
      </section>}
      {errors.sprints && <p className="project-error">{errors.sprints}</p>}
    </div>}

    {step === 5 && (!form.sprints.length ? <div className="project-empty-state project-no-sprints"><span className="material-symbols-outlined">bolt</span><h3>No Sprints Generated</h3><p>Set valid dates and a sprint duration in Configure Sprint to generate the roadmap automatically.</p></div> : <div className="task-creation-step">
      {errors.tasks && <p className="project-error">{errors.tasks}</p>}
      <div className="project-grid task-step"><div className="task-form-stack">
        <section className="project-card task-form-card"><div className="project-card-heading"><h2>Task Details</h2><p>Define the task and set the basic information.</p></div>
          <div className="project-grid two"><Field label="Task name *"><input maxLength={100} value={taskDraft.name} placeholder="Task name" onChange={event => setTaskDraft(current => ({ ...current, name: event.target.value }))} /></Field><Field label="Sprint *"><select value={taskDraft.sprintKey} onChange={event => setTaskDraft(current => ({ ...current, sprintKey: event.target.value }))}><option value="">Select sprint</option>{form.sprints.map(sprint => <option key={sprint.key} value={sprint.key}>{sprint.name}</option>)}</select></Field></div>
          <Field label="Description (optional)"><textarea rows={3} value={taskDraft.description} placeholder="Describe the task" onChange={event => setTaskDraft(current => ({ ...current, description: event.target.value }))} /></Field>
          <div className="project-grid three"><Field label="Start date *"><DatePicker placeholder="Select start date" style={{ height: 42 }} min={form.startDate} max={taskDraft.dueDate || form.endDate} value={taskDraft.startDate} onChange={value => setTaskDraft(current => ({ ...current, startDate: value }))} /></Field><Field label="Due date *"><DatePicker placeholder="Select end date" style={{ height: 42 }} min={taskDraft.startDate || form.startDate} max={form.endDate} value={taskDraft.dueDate} onChange={value => setTaskDraft(current => ({ ...current, dueDate: value }))} /></Field><Field label="Priority *"><select value={taskDraft.priority} onChange={event => setTaskDraft(current => ({ ...current, priority: event.target.value }))}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></Field></div>
        </section>
        <section className="project-card task-form-card"><div className="project-card-heading"><h2>Additional details</h2><p>Add dependencies, milestones and features related to this task.</p></div>
          <div className="project-grid two"><div><strong className="project-small-heading">Add dependency</strong><button type="button" className="dependency-add-trigger" onClick={openDependencyDialog}>＋ Click to add dependency</button>{taskDependencies.map((dependency, index) => <div className="task-dependency-editor" key={dependency.key}><div className="project-row-heading"><strong>{userName(selectedUsers.find(item => String(item.id) === String(dependency.assignee)) || {}) || `Dependency ${index + 1}`}</strong><button type="button" onClick={() => setTaskDependencies(current => current.filter(item => item.key !== dependency.key))}>Remove</button></div><small>{formatDate(dependency.dueDate)}</small>{dependency.description && <p>{dependency.description}</p>}</div>)}</div>
            <Field label="Add milestones"><select value={taskDraft.milestoneKey} onChange={event => setTaskDraft(current => ({ ...current, milestoneKey: event.target.value, featureKey: '' }))}><option value="">Select milestone (optional)</option>{form.milestones.map(milestone => <option key={milestone.key} value={milestone.key}>{milestone.name}</option>)}</select></Field>
            <Field label="Dependency type"><select value={taskDraft.dependencyType || ''} onChange={event => { const value = event.target.value; setTaskDraft(current => ({ ...current, dependencyType: value })); setTaskDependencies(current => current.map(item => ({ ...item, dependencyType: value || 'optional' }))) }}><option value="">Select type</option><option value="mandatory">Mandatory dependency</option><option value="optional">Optional dependency</option></select></Field>
            <Field label="Add features"><select value={taskDraft.featureKey} onChange={event => { const featureKey = event.target.value; const milestone = form.milestones.find(item => item.features.some(feature => feature.key === featureKey)); setTaskDraft(current => ({ ...current, featureKey, milestoneKey: milestone?.key || current.milestoneKey })) }}><option value="">Select feature (optional)</option>{(taskDraft.milestoneKey ? form.milestones.filter(item => item.key === taskDraft.milestoneKey) : form.milestones).flatMap(item => item.features).map(feature => <option key={feature.key} value={feature.key}>{feature.name}</option>)}</select></Field>
          </div>
        </section>
        <section className="project-card task-form-card"><div className="project-card-heading"><h2>Assign &amp; review</h2></div><div className="project-grid two"><Field label="Reviewer"><SelectUser users={selectedUsers} value={taskDraft.reviewer} onChange={value => setTaskDraft(current => ({ ...current, reviewer: value }))} optional /></Field><Field label="Assigned to *"><SelectUser users={selectedUsers} value={taskDraft.assignee} onChange={value => setTaskDraft(current => ({ ...current, assignee: value }))} /></Field></div></section>
        <div className="project-form-actions left"><button type="button" className="project-primary" onClick={saveTaskDraft}><span className="material-symbols-outlined">add</span>{editingTaskKey ? 'Update task' : 'Create task'}</button>{editingTaskKey && <button type="button" className="project-secondary" onClick={resetTaskDraft}>Cancel edit</button>}</div>
      </div>
      <div className="task-side-column"><section className="project-card task-added-card"><div className="task-added-heading"><h2>Task added</h2><span>{form.tasks.length}</span></div>
        {!form.tasks.length ? <div className="project-empty-state"><strong>No tasks added yet</strong><p>Complete the task form to add it to the project.</p></div> : <details className="task-list-group" open><summary>Tasks ({form.tasks.length})<span className="material-symbols-outlined">expand_more</span></summary><div className="task-added-list">{form.tasks.map(task => <article key={task.key}><div className="project-row-heading"><h3>{task.name}</h3><div><button type="button" onClick={() => editTask(task)}>Edit</button><button type="button" onClick={() => removeTask(task.key)}>Remove</button></div></div><dl><dt>Description</dt><dd>{task.description || '—'}</dd><dt>Sprint</dt><dd>{form.sprints.find(sprint => sprint.key === task.sprintKey)?.name || 'Not assigned'}</dd><dt>Reviewer</dt><dd>{userName(options.users.find(item => String(item.id) === String(task.reviewer)) || {}) || 'Not assigned'}</dd><dt>Assignees</dt><dd>{userName(options.users.find(item => String(item.id) === String(task.assignee)) || {}) || 'Not assigned'}</dd><dt>Dependencies</dt><dd>{form.dependencies.filter(dependency => dependency.taskKey === task.key).map(dependency => userName(options.users.find(item => String(item.id) === String(dependency.assignee)) || {}) || dependency.description).filter(Boolean).join(', ') || 'None'}</dd></dl></article>)}</div></details>}
      </section></div></div>
    </div>)}

    <dialog className="project-dependency-dialog" ref={dependencyDialog} aria-labelledby="dependency-dialog-title">
      <h2 id="dependency-dialog-title">Add Dependency</h2>
      <Field label="Assigned to *"><SelectUser users={selectedUsers} value={dependencyDraft.assignee} onChange={value => setDependencyDraft(current => ({ ...current, assignee: value }))} /></Field>
      <Field label="Description (optional)"><textarea rows={3} value={dependencyDraft.description} onChange={event => setDependencyDraft(current => ({ ...current, description: event.target.value }))} /></Field>
      <Field label="Due date *"><DatePicker placeholder="Select due date" value={dependencyDraft.dueDate} onChange={value => setDependencyDraft(current => ({ ...current, dueDate: value }))} /></Field>
      {dependencyError && <p className="project-error" role="alert">{dependencyError}</p>}
      <div className="project-form-actions"><button type="button" className="project-secondary" onClick={() => dependencyDialog.current.close()}>Cancel</button><button type="button" className="project-primary" onClick={saveDependencyDraft}>Add Dependency</button></div>
    </dialog>
    <footer className="project-editor-actions"><div>{step === 0 ? <Link to="/projects" className="project-secondary">Cancel</Link> : <button type="button" className="project-secondary" onClick={() => setStep(value => value - 1)}>Back</button>}</div>
      <div>{step > 0 && !projectId && <button type="button" className="project-secondary" onClick={saveDraft}>Save &amp; Continue later</button>}
        {step < lastStep ? <button type="button" className="project-primary" onClick={goNext}>Next <span className="material-symbols-outlined">arrow_forward</span></button> :
          <button type="button" className="project-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : projectId ? 'Update Project' : 'Create Project'}</button>}
      </div></footer>
    </div>
  </div>
}
