import { useState } from 'react'
import { apiRequest } from '../../services/api/apiClient.js'
import { ModalField, ModalShell } from './ProjectModal.jsx'
import { canUsePermission, displayName, getApiError } from './modalUtils.js'

export default function AssignTaskModal({ isOpen, onClose, tasks = [], users = [], permissions, user, onUpdated }) {
  const [taskId, setTaskId] = useState('')
  const [assignee, setAssignee] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const allowed = canUsePermission({ ...user, permissions: permissions || user?.permissions }, 'Tasks', 'Edit')

  const close = () => { setTaskId(''); setAssignee(''); setError(''); onClose() }

  const submit = async event => {
    event.preventDefault()
    if (!allowed) return
    if (!taskId || !assignee) { setError('Select a task and a team member.'); return }
    setSaving(true)
    setError('')
    try {
      const result = await apiRequest(`/tasks/${taskId}/`, { method: 'PATCH', body: { assigned_to: assignee } })
      onUpdated?.(result)
      close()
    } catch (requestError) { setError(getApiError(requestError)) }
    finally { setSaving(false) }
  }

  if (!allowed) return null
  return <ModalShell isOpen={isOpen} onClose={close} title="Assign Task" subtitle="Choose a task and assign it to a project member.">
    <form className="project-modal-form" onSubmit={submit}>
      <ModalField label="Task" required><select value={taskId} onChange={event => setTaskId(event.target.value)}><option value="">Select task</option>{tasks.map(task => <option key={task.id || task.pk} value={task.id || task.pk}>{task.Task_Name || task.name || 'Task'}</option>)}</select></ModalField>
      <ModalField label="Assigned to" required><select value={assignee} onChange={event => setAssignee(event.target.value)}><option value="">Select team member</option>{users.map(person => <option key={person.id} value={person.id}>{displayName(person)}</option>)}</select></ModalField>
      {error && <p className="project-modal-error" role="alert">{error}</p>}
      <div className="project-modal-actions"><button type="button" onClick={close} disabled={saving}>Cancel</button><button className="primary" type="submit" disabled={saving}>{saving ? 'Assigning…' : 'Assign task'}</button></div>
    </form>
  </ModalShell>
}
