import { useState } from 'react'
import { apiRequest } from '../../services/api/apiClient.js'
import { ModalField, ModalShell } from './ProjectModal.jsx'
import { canUsePermission, getApiError } from './modalUtils.js'

const emptyMilestone = () => ({ name: '', description: '', startDate: '', dueDate: '' })

export default function AddMilestoneModal({ isOpen, onClose, projectId, permissions, user, onCreated }) {
  const [milestone, setMilestone] = useState(emptyMilestone)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const allowed = canUsePermission({ ...user, permissions: permissions || user?.permissions }, 'Milestones', 'Create')
  const update = (field, value) => setMilestone(current => ({ ...current, [field]: value }))

  const close = () => { setMilestone(emptyMilestone()); setError(''); onClose() }

  const submit = async event => {
    event.preventDefault()
    if (!allowed) return
    if (!projectId || !milestone.name.trim() || !milestone.startDate || !milestone.dueDate) { setError('Milestone name and both dates are required.'); return }
    if (milestone.dueDate < milestone.startDate) { setError('End date must be on or after start date.'); return }
    setSaving(true)
    setError('')
    try {
      const result = await apiRequest('/milestones/', { method: 'POST', body: {
        project: projectId, name: milestone.name.trim(), description: milestone.description.trim(),
        start_date: milestone.startDate, due_date: milestone.dueDate,
      } })
      onCreated?.(result)
      setMilestone(emptyMilestone())
      close()
    } catch (requestError) { setError(getApiError(requestError)) }
    finally { setSaving(false) }
  }

  if (!allowed) return null
  return <ModalShell isOpen={isOpen} onClose={close} title="Add Milestone" subtitle="Define a new milestone.">
    <form className="project-modal-form" onSubmit={submit}>
      <ModalField label="Milestone" required><input maxLength={100} value={milestone.name} onChange={event => update('name', event.target.value)} placeholder="Add Milestone" /></ModalField>
      <ModalField label="Description (optional)"><textarea rows={3} value={milestone.description} onChange={event => update('description', event.target.value)} placeholder="Add a description" /></ModalField>
      <div className="project-modal-row"><ModalField label="Start date" required><input type="date" value={milestone.startDate} onChange={event => update('startDate', event.target.value)} /></ModalField><ModalField label="End date" required><input type="date" min={milestone.startDate || undefined} value={milestone.dueDate} onChange={event => update('dueDate', event.target.value)} /></ModalField></div>
      {error && <p className="project-modal-error" role="alert">{error}</p>}
      <div className="project-modal-actions"><button type="button" onClick={close} disabled={saving}>Cancel</button><button className="primary" type="submit" disabled={saving || !projectId}>{saving ? 'Adding…' : '＋ Add Milestone'}</button></div>
    </form>
  </ModalShell>
}
