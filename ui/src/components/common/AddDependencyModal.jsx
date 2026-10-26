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
  ]
}
const styling = value => {
  const classes = typeof value === 'string' ? value : ''
  const utilities = classes.split(/\s+/).flatMap(name => tailwindStyling[name] || [])
  return [...new Set([...classes.split(/\s+/), ...utilities])].filter(Boolean).join(' ')
}



export default function AddDependencyModal({ isOpen, onClose, task, tasks = [], users = [], permissions, user, onCreated }) {
  const [taskId, setTaskId] = useState('')
  const [dependsOn, setDependsOn] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [reviewer, setReviewer] = useState('')
  const [description, setDescription] = useState('')
  const [dependencyType, setDependencyType] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const allowed = canUsePermission({ ...user, permissions: permissions || user?.permissions }, 'Dependencies', 'Create')
  const selectedTask = task?.id || task?.pk || task?.task || taskId

  const close = () => { setTaskId(''); setDependsOn(''); setAssignedTo(''); setReviewer(''); setDescription(''); setDependencyType(''); setDueDate(''); setError(''); onClose() }

  const submit = async event => {
    event.preventDefault()
    if (!allowed) return
    if (!selectedTask || !assignedTo || !dueDate || !description.trim() || !dependencyType) {
      setError('Select a task, assignee, due date, dependency type, and description.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = await apiRequest('/dependencies/', { method: 'POST', body: {
        task: selectedTask, depends_on: dependsOn || null,
        description: description.trim(), dependency_type: dependencyType,
        assigned_to: assignedTo || null, review_by: reviewer || null, due_date: dueDate || null,
      } })
      onCreated?.(result)
      close()
    } catch (requestError) { setError(getApiError(requestError)) }
    finally { setSaving(false) }
  }

  if (!allowed) return null
  return <ModalShell isOpen={isOpen} onClose={close} title="Add Dependency" subtitle="Describe the dependency for this task.">
    <form className={styling("project-modal-form")} onSubmit={submit}>
      {!task && <ModalField label="Task" required><select value={taskId} onChange={event => setTaskId(event.target.value)}><option value="">Select task</option>{tasks.map(item => <option key={item.id || item.pk} value={item.id || item.pk}>{item.Task_Name || item.name || 'Task'}</option>)}</select></ModalField>}
      {tasks.length > 0 && <ModalField label="Depends on"><select value={dependsOn} onChange={event => setDependsOn(event.target.value)}><option value="">No linked task</option>{tasks.filter(item => String(item.id || item.pk) !== String(selectedTask)).map(item => <option key={item.id || item.pk} value={item.id || item.pk}>{item.Task_Name || item.name || 'Task'}</option>)}</select></ModalField>}
      <ModalField label="Dependency type" required><select value={dependencyType} onChange={event => setDependencyType(event.target.value)}><option value="">Select type</option><option value="mandatory">Mandatory dependency</option><option value="optional">Optional dependency</option></select></ModalField>
      <ModalField label="Description" required><textarea rows={3} value={description} onChange={event => setDescription(event.target.value)} placeholder="Describe the dependency" /></ModalField>
      <div className={styling("project-modal-row")}><ModalField label="Assigned to" required><select value={assignedTo} onChange={event => setAssignedTo(event.target.value)}><option value="">Select team member</option>{users.map(person => <option key={person.id} value={person.id}>{displayName(person)}</option>)}</select></ModalField><ModalField label="Due date" required><input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} /></ModalField></div>
      <ModalField label="Reviewer"><select value={reviewer} onChange={event => setReviewer(event.target.value)}><option value="">None (No Reviewer)</option>{users.map(person => <option key={person.id} value={person.id}>{displayName(person)}</option>)}</select></ModalField>
      {error && <p className={styling("project-modal-error")} role="alert">{error}</p>}
      <div className={styling("project-modal-actions")}><button type="button" onClick={close} disabled={saving}>Cancel</button><button className={styling("primary")} type="submit" disabled={saving}>{saving ? 'Adding…' : 'Add Dependency'}</button></div>
    </form>
  </ModalShell>
}
