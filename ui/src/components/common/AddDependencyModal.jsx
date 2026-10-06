import { useState } from 'react'
import { apiRequest } from '../../services/api/apiClient.js'
import { ModalField, ModalShell } from './ProjectModal.jsx'
import { canUsePermission, displayName, getApiError } from './modalUtils.js'

export default function AddDependencyModal({ isOpen, onClose, task, tasks = [], users = [], permissions, user, onCreated }) {
  const [taskId, setTaskId] = useState('')
  const [dependsOn, setDependsOn] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [description, setDescription] = useState('')
  const [dependencyType, setDependencyType] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const allowed = canUsePermission({ ...user, permissions: permissions || user?.permissions }, 'Dependencies', 'Create')
  const selectedTask = task?.id || task?.pk || task?.task || taskId

  const close = () => { setTaskId(''); setDependsOn(''); setAssignedTo(''); setDescription(''); setDependencyType(''); setDueDate(''); setError(''); onClose() }

  const submit = async event => {
    event.preventDefault()
    if (!allowed) return
    if (!selectedTask || !description.trim() || !dependencyType) {
      setError('Select a task, dependency type, and description.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = await apiRequest('/dependencies/', { method: 'POST', body: {
        task: selectedTask, depends_on: dependsOn || null,
        description: description.trim(), dependency_type: dependencyType,
        assigned_to: assignedTo || null, due_date: dueDate || null,
      } })
      onCreated?.(result)
      close()
    } catch (requestError) { setError(getApiError(requestError)) }
    finally { setSaving(false) }
  }

  if (!allowed) return null
  return <ModalShell isOpen={isOpen} onClose={close} title="Add Dependency" subtitle="Describe the dependency for this task.">
    <form className="project-modal-form" onSubmit={submit}>
      {!task && <ModalField label="Task" required><select value={taskId} onChange={event => setTaskId(event.target.value)}><option value="">Select task</option>{tasks.map(item => <option key={item.id || item.pk} value={item.id || item.pk}>{item.Task_Name || item.name || 'Task'}</option>)}</select></ModalField>}
      {tasks.length > 0 && <ModalField label="Depends on"><select value={dependsOn} onChange={event => setDependsOn(event.target.value)}><option value="">No linked task</option>{tasks.filter(item => String(item.id || item.pk) !== String(selectedTask)).map(item => <option key={item.id || item.pk} value={item.id || item.pk}>{item.Task_Name || item.name || 'Task'}</option>)}</select></ModalField>}
      <ModalField label="Dependency type" required><select value={dependencyType} onChange={event => setDependencyType(event.target.value)}><option value="">Select type</option><option value="mandatory">Mandatory dependency</option><option value="optional">Optional dependency</option></select></ModalField>
      <ModalField label="Description" required><textarea rows={3} value={description} onChange={event => setDescription(event.target.value)} placeholder="Describe the dependency" /></ModalField>
      <div className="project-modal-row"><ModalField label="Assigned to"><select value={assignedTo} onChange={event => setAssignedTo(event.target.value)}><option value="">Not assigned</option>{users.map(person => <option key={person.id} value={person.id}>{displayName(person)}</option>)}</select></ModalField><ModalField label="Due date"><input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} /></ModalField></div>
      {error && <p className="project-modal-error" role="alert">{error}</p>}
      <div className="project-modal-actions"><button type="button" onClick={close} disabled={saving}>Cancel</button><button className="primary" type="submit" disabled={saving}>{saving ? 'Adding…' : 'Add Dependency'}</button></div>
    </form>
  </ModalShell>
}
