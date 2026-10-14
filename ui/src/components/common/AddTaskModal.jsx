import { useState } from 'react'
import { apiRequest } from '../../services/api/apiClient.js'
import { ModalField, ModalShell } from './ProjectModal.jsx'
import { canUsePermission, displayName, getApiError } from './modalUtils.js'

/* styling */
const tailwindStyling = {
  "project-modal": [
    "[width:min(100%,_870px)]",
    "[max-height:calc(100vh_-_32px)]",
    "[overflow-y:auto]",
    "[padding:32px]",
    "[box-sizing:border-box]",
    "[border:1px_solid_#e2e8f0]",
    "[border-radius:16px]",
    "[background:#fff]",
    "[box-shadow:0_18px_50px_#0f172a30]",
    "[&.wide]:[width:min(100%,_980px)]",
    "max-[700px]:[padding:22px_18px]"
  ],
  "project-modal-form": [
    "[display:grid]",
    "[gap:20px]"
  ],
  "project-modal-row": [
    "[display:grid]",
    "[grid-template-columns:repeat(2,minmax(0,1fr))]",
    "[gap:16px]",
    "[align-items:end]",
    "max-[700px]:[grid-template-columns:1fr]"
  ],
  "project-modal-actions": [
    "[display:flex]",
    "[justify-content:flex-end]",
    "[gap:10px]",
    "[&_button]:[min-height:48px]",
    "[&_button]:[padding:10px_22px]",
    "[&_button]:[border:1px_solid_#d1d9e5]",
    "[&_button]:[border-radius:8px]",
    "[&_button]:[background:#fff]",
    "[&_button]:[color:#334155]",
    "[&_button]:[font:inherit]",
    "[&_button]:[font-size:15px]",
    "[&_button]:[font-weight:650]",
    "[&_button]:[cursor:pointer]",
    "[&_.primary]:[display:inline-flex]",
    "[&_.primary]:[align-items:center]",
    "[&_.primary]:[justify-content:center]",
    "[&_.primary]:[gap:8px]",
    "[&_.primary]:[border-color:#2169df]",
    "[&_.primary]:[background:#2169df]",
    "[&_.primary]:[color:#fff]",
    "[&_button:disabled]:[cursor:wait]",
    "[&_button:disabled]:[opacity:.6]",
    "max-[700px]:[flex-wrap:wrap]"
  ],
  "project-modal-error": [
    "[margin:0]",
    "[color:#b91c1c]",
    "[font-size:13px]"
  ],
  "priority": [
    "[display:inline-flex]",
    "[min-width:73px]",
    "[height:36px]",
    "[align-items:center]",
    "[justify-content:center]",
    "[border-radius:9px]",
    "[font-size:11px]",
    "[&.low]:[background:#c9d77f]",
    "[&.high]:[background:#ef777b]",
    "[&.medium]:[background:#bdc8f7]"
  ]
}
const styling = value => {
  const classes = typeof value === 'string' ? value : ''
  const utilities = classes.split(/\s+/).flatMap(name => tailwindStyling[name] || [])
  return [...new Set([...classes.split(/\s+/), ...utilities])].filter(Boolean).join(' ')
}



const initialTask = () => ({ name: '', description: '', startDate: '', dueDate: '', priority: 'medium', sprint: '', milestone: '', feature: '', assignee: '', reviewer: '' })

export default function AddTaskModal({ isOpen, onClose, projectId, projectName, users = [], sprints = [], milestones = [], features = [], permissions, user, onCreated, embedded = false }) {
  const [task, setTask] = useState(initialTask)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const allowed = canUsePermission({ ...user, permissions: permissions || user?.permissions }, 'Tasks', 'Create')
  const update = (field, value) => setTask(current => ({ ...current, [field]: value }))

  const close = () => { setTask(initialTask()); setError(''); onClose() }

  const submit = async event => {
    event.preventDefault()
    if (!allowed) return
    if (!projectId || !task.name.trim() || !task.assignee) { setError('Project, task name, and assignee are required.'); return }
    if (task.startDate && task.dueDate && task.dueDate < task.startDate) { setError('Due date must be on or after the start date.'); return }
    setSaving(true)
    setError('')
    try {
      const result = await apiRequest('/tasks/', { method: 'POST', body: {
        project: projectId, Task_Name: task.name.trim(), description: task.description.trim(),
        planned_start_date: task.startDate || null, Due_Date: task.dueDate || null,
        Remarks: JSON.stringify({ priority: task.priority }), sprint: task.sprint || null,
        feature: task.feature || null, assigned_to: task.assignee, review_by: task.reviewer || null,
      } })
      onCreated?.(result)
      setTask(initialTask())
      close()
    } catch (requestError) { setError(getApiError(requestError)) }
    finally { setSaving(false) }
  }

  if (!allowed || (embedded && !isOpen)) return null
  const form = <form className={styling("project-modal-form")} onSubmit={submit}>
      {!projectId && <p className={styling("project-modal-error")}>Select a project before opening this form.</p>}
      <div className={styling("project-modal-row")}><ModalField label="Task name" required><input maxLength={100} value={task.name} onChange={event => update('name', event.target.value)} placeholder="Task name" /></ModalField><ModalField label="Assigned to" required><select value={task.assignee} onChange={event => update('assignee', event.target.value)}><option value="">Select team member</option>{users.map(person => <option key={person.id} value={person.id}>{displayName(person)}</option>)}</select></ModalField></div>
      <ModalField label="Description"><textarea rows={3} value={task.description} onChange={event => update('description', event.target.value)} placeholder="Describe the task" /></ModalField>
      <div className={styling("project-modal-row")}><ModalField label="Start date"><input type="date" value={task.startDate} onChange={event => update('startDate', event.target.value)} /></ModalField><ModalField label="Due date"><input type="date" min={task.startDate || undefined} value={task.dueDate} onChange={event => update('dueDate', event.target.value)} /></ModalField></div>
      <div className={styling("project-modal-row")}><ModalField label="Priority"><select value={task.priority} onChange={event => update('priority', event.target.value)}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></ModalField><ModalField label="Reviewer"><select value={task.reviewer} onChange={event => update('reviewer', event.target.value)}><option value="">None</option>{users.map(person => <option key={person.id} value={person.id}>{displayName(person)}</option>)}</select></ModalField></div>
      <div className={styling("project-modal-row")}><ModalField label="Milestone"><select value={task.milestone} onChange={event => setTask(current => ({ ...current, milestone: event.target.value, feature: '' }))}><option value="">No milestone</option>{milestones.map(milestone => <option key={milestone.id} value={milestone.id}>{milestone.name}</option>)}</select></ModalField><ModalField label="Feature"><select value={task.feature} onChange={event => update('feature', event.target.value)}><option value="">No feature</option>{features.filter(feature => !task.milestone || String(feature.milestone || feature.Milestone) === String(task.milestone)).map(feature => <option key={feature.id} value={feature.id}>{feature.feature_name || feature.name}</option>)}</select></ModalField></div>
      <ModalField label="Sprint"><select value={task.sprint} onChange={event => update('sprint', event.target.value)}><option value="">No sprint</option>{sprints.map(sprint => <option key={sprint.id} value={sprint.id}>{sprint.Sprint_Name || sprint.name}</option>)}</select></ModalField>
      {error && <p className={styling("project-modal-error")} role="alert">{error}</p>}
      <div className={styling("project-modal-actions")}><button type="button" onClick={close} disabled={saving}>Cancel</button><button className={styling("primary")} type="submit" disabled={saving || !projectId}>{saving ? 'Creating…' : 'Create task'}</button></div>
    </form>
  return embedded ? form : <ModalShell isOpen={isOpen} onClose={close} title="Add Task" subtitle={projectName ? `Create a task for ${projectName}.` : 'Create a task for this project.'} wide>{form}</ModalShell>
}
