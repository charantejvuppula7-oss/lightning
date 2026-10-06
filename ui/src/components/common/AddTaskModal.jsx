import { useState } from 'react'
import { apiRequest } from '../../services/api/apiClient.js'
import { ModalField, ModalShell } from './ProjectModal.jsx'
import { canUsePermission, displayName, getApiError } from './modalUtils.js'

const initialTask = () => ({ name: '', description: '', startDate: '', dueDate: '', priority: 'medium', sprint: '', feature: '', assignee: '', reviewer: '' })

export default function AddTaskModal({ isOpen, onClose, projectId, projectName, users = [], sprints = [], features = [], permissions, user, onCreated }) {
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

  if (!allowed) return null
  return <ModalShell isOpen={isOpen} onClose={close} title="Add Task" subtitle={projectName ? `Create a task for ${projectName}.` : 'Create a task for this project.'} wide>
    <form className="project-modal-form" onSubmit={submit}>
      {!projectId && <p className="project-modal-error">Select a project before opening this form.</p>}
      <div className="project-modal-row"><ModalField label="Task name" required><input maxLength={100} value={task.name} onChange={event => update('name', event.target.value)} placeholder="Task name" /></ModalField><ModalField label="Assigned to" required><select value={task.assignee} onChange={event => update('assignee', event.target.value)}><option value="">Select team member</option>{users.map(person => <option key={person.id} value={person.id}>{displayName(person)}</option>)}</select></ModalField></div>
      <ModalField label="Description"><textarea rows={3} value={task.description} onChange={event => update('description', event.target.value)} placeholder="Describe the task" /></ModalField>
      <div className="project-modal-row"><ModalField label="Start date"><input type="date" value={task.startDate} onChange={event => update('startDate', event.target.value)} /></ModalField><ModalField label="Due date"><input type="date" min={task.startDate || undefined} value={task.dueDate} onChange={event => update('dueDate', event.target.value)} /></ModalField></div>
      <div className="project-modal-row"><ModalField label="Priority"><select value={task.priority} onChange={event => update('priority', event.target.value)}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></ModalField><ModalField label="Reviewer"><select value={task.reviewer} onChange={event => update('reviewer', event.target.value)}><option value="">None</option>{users.map(person => <option key={person.id} value={person.id}>{displayName(person)}</option>)}</select></ModalField></div>
      <div className="project-modal-row"><ModalField label="Sprint"><select value={task.sprint} onChange={event => update('sprint', event.target.value)}><option value="">No sprint</option>{sprints.map(sprint => <option key={sprint.id} value={sprint.id}>{sprint.Sprint_Name || sprint.name}</option>)}</select></ModalField><ModalField label="Feature"><select value={task.feature} onChange={event => update('feature', event.target.value)}><option value="">No feature</option>{features.map(feature => <option key={feature.id} value={feature.id}>{feature.feature_name || feature.name}</option>)}</select></ModalField></div>
      {error && <p className="project-modal-error" role="alert">{error}</p>}
      <div className="project-modal-actions"><button type="button" onClick={close} disabled={saving}>Cancel</button><button className="primary" type="submit" disabled={saving || !projectId}>{saving ? 'Creating…' : 'Create task'}</button></div>
    </form>
  </ModalShell>
}
