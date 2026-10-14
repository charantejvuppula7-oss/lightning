import { useState } from 'react'
import { apiRequest } from '../../services/api/apiClient.js'
import { ModalField, ModalShell } from './ProjectModal.jsx'
import { canUsePermission, displayName, getApiError } from './modalUtils.js'
import AddTaskModal from './AddTaskModal.jsx'

/* styling */
const tailwindStyling = {
  "tabs": [
    "[display:flex]",
    "[gap:0]",
    "[border-bottom:1px_solid_#aaaeb8]",
    "[margin-top:27px]",
    "[&_button]:[min-width:155px]",
    "[&_button]:[height:45px]",
    "[&_button]:[padding:0_18px]",
    "[&_button]:[border:0]",
    "[&_button]:[border-bottom:2px_solid_transparent]",
    "[&_button]:[background:transparent]",
    "[&_button]:[color:#737986]",
    "[&_button]:[font:inherit]",
    "[&_button]:[font-size:14px]",
    "[&_button]:[cursor:pointer]",
    "[&_button.selected]:[border-bottom-color:#1760d0]",
    "[&_button.selected]:[color:#1760d0]"
  ],
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
  "project-modal-tabs": [
    "[display:flex]",
    "[gap:20px]",
    "[margin:-8px_0_20px]",
    "[border-bottom:1px_solid_#e2e8f0]",
    "[&_button]:[padding:0_4px_11px]",
    "[&_button]:[border:0]",
    "[&_button]:[border-bottom:2px_solid_transparent]",
    "[&_button]:[background:transparent]",
    "[&_button]:[color:#64748b]",
    "[&_button]:[font:inherit]",
    "[&_button]:[font-size:14px]",
    "[&_button]:[font-weight:600]",
    "[&_button]:[cursor:pointer]",
    "[&_button.selected]:[border-bottom-color:#2169df]",
    "[&_button.selected]:[color:#2169df]"
  ]
}
const styling = value => {
  const classes = typeof value === 'string' ? value : ''
  const utilities = classes.split(/\s+/).flatMap(name => tailwindStyling[name] || [])
  return [...new Set([...classes.split(/\s+/), ...utilities])].filter(Boolean).join(' ')
}



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
    <div className={styling("project-modal-tabs")} role="tablist" aria-label="Task assignment mode">
      {canCreate && <button type="button" role="tab" aria-selected={selectedTab === 'add'} className={styling(selectedTab === 'add' ? 'selected' : '')} onClick={() => setActiveTab('add')}>Add task</button>}
      {canEdit && <button type="button" role="tab" aria-selected={selectedTab === 'reassign'} className={styling(selectedTab === 'reassign' ? 'selected' : '')} onClick={() => setActiveTab('reassign')}>Reassign task</button>}
    </div>
    {selectedTab === 'add' ? <AddTaskModal embedded isOpen onClose={close} projectId={projectId} projectName={projectName}
      users={users} sprints={sprints} milestones={milestones} features={features} permissions={permissions} user={user}
      onCreated={result => { onUpdated?.(result); close() }} /> : <form className={styling("project-modal-form")} onSubmit={submit}>
      <ModalField label="Task" required><select value={taskId} onChange={event => setTaskId(event.target.value)}><option value="">Select task</option>{tasks.map(task => <option key={task.id || task.pk} value={task.id || task.pk}>{task.Task_Name || task.name || 'Task'}</option>)}</select></ModalField>
      <ModalField label="Assigned to" required><select value={assignee} onChange={event => setAssignee(event.target.value)}><option value="">Select team member</option>{users.map(person => <option key={person.id} value={person.id}>{displayName(person)}</option>)}</select></ModalField>
      {error && <p className={styling("project-modal-error")} role="alert">{error}</p>}
      <div className={styling("project-modal-actions")}><button type="button" onClick={close} disabled={saving}>Cancel</button><button className={styling("primary")} type="submit" disabled={saving}>{saving ? 'Assigning…' : 'Reassign task'}</button></div>
    </form>}
  </ModalShell>
}
