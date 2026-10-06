import { useState } from 'react'
import { apiRequest } from '../../services/api/apiClient.js'
import { ModalField, ModalShell } from './ProjectModal.jsx'
import { canUsePermission, displayName, getApiError } from './modalUtils.js'
import AddTaskModal from './AddTaskModal.jsx'

export default function AssignTaskModal({ isOpen, onClose, tasks = [], users = [], sprints = [], milestones = [], features = [], projectId, projectName, permissions, user, onUpdated, initialTab = 'add' }) {
  const [taskId, setTaskId] = useState('')
  const [assignee, setAssignee] = useState('')
  const [activeTab, setActiveTab] = useState(initialTab)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const effectiveUser = { ...user, permissions: permissions || user?.permissions }
  const canCreate = canUsePermission(effectiveUser, 'Tasks', 'Create')
  const canEdit = canUsePermission(effectiveUser, 'Tasks', 'Edit')

  const close = () => { setTaskId(''); setAssignee(''); setError(''); onClose() }

  const submit = async event => {
    event.preventDefault()
    if (!canEdit) return
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

  if (!isOpen || (!canCreate && !canEdit)) return null
  const selectedTab = activeTab === 'add' && !canCreate ? 'reassign' : activeTab === 'reassign' && !canEdit ? 'add' : activeTab
  return <ModalShell isOpen onClose={close} title="Assign Task" subtitle={selectedTab === 'add' ? 'Create a new task and assign it to a team member.' : 'Move a task to another team member.'} wide>
    <div className="project-modal-tabs" role="tablist" aria-label="Task assignment mode">
      {canCreate && <button type="button" role="tab" aria-selected={selectedTab === 'add'} className={selectedTab === 'add' ? 'selected' : ''} onClick={() => setActiveTab('add')}>Add task</button>}
      {canEdit && <button type="button" role="tab" aria-selected={selectedTab === 'reassign'} className={selectedTab === 'reassign' ? 'selected' : ''} onClick={() => setActiveTab('reassign')}>Reassign task</button>}
    </div>
    {selectedTab === 'add' ? <AddTaskModal embedded isOpen onClose={close} projectId={projectId} projectName={projectName}
      users={users} sprints={sprints} milestones={milestones} features={features} permissions={permissions} user={user}
      onCreated={result => { onUpdated?.(result); close() }} /> : <form className="project-modal-form" onSubmit={submit}>
      <ModalField label="Task" required><select value={taskId} onChange={event => setTaskId(event.target.value)}><option value="">Select task</option>{tasks.map(task => <option key={task.id || task.pk} value={task.id || task.pk}>{task.Task_Name || task.name || 'Task'}</option>)}</select></ModalField>
      <ModalField label="Assigned to" required><select value={assignee} onChange={event => setAssignee(event.target.value)}><option value="">Select team member</option>{users.map(person => <option key={person.id} value={person.id}>{displayName(person)}</option>)}</select></ModalField>
      {error && <p className="project-modal-error" role="alert">{error}</p>}
      <div className="project-modal-actions"><button type="button" onClick={close} disabled={saving}>Cancel</button><button className="primary" type="submit" disabled={saving}>{saving ? 'Assigning…' : 'Reassign task'}</button></div>
    </form>}
  </ModalShell>
}
