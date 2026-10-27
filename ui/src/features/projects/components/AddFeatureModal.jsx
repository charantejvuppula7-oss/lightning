import { useState } from 'react'
import { apiRequest } from '../../../shared/api/apiClient.js'
import { ModalField, ModalShell } from '../../../shared/ui/Modal.jsx'
import { canUsePermission, getApiError } from '../../../shared/utils/modalUtils.js'

const emptyFeature = () => ({ milestone: '', name: '', startDate: '', dueDate: '' })

export default function AddFeatureModal({ isOpen, onClose, milestones = [], permissions, user, onCreated }) {
  const [feature, setFeature] = useState(emptyFeature)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const allowed = canUsePermission({ ...user, permissions: permissions || user?.permissions }, 'Features', 'Create')
  const update = (field, value) => setFeature(current => ({ ...current, [field]: value }))

  const close = () => { setFeature(emptyFeature()); setError(''); onClose() }

  const submit = async event => {
    event.preventDefault()
    if (!allowed) return
    if (!feature.milestone || !feature.name.trim() || !feature.startDate || !feature.dueDate) { setError('Milestone, feature name, and both dates are required.'); return }
    if (feature.dueDate < feature.startDate) { setError('End date must be on or after start date.'); return }
    setSaving(true)
    setError('')
    try {
      const result = await apiRequest('/features/', { method: 'POST', body: {
        Milestone: feature.milestone, feature_name: feature.name.trim(), description: '',
        feature_status: 'pending', feature_priority: 'medium',
        feature_start_date: feature.startDate, feature_due_date: feature.dueDate,
      } })
      onCreated?.(result)
      setFeature(emptyFeature())
      close()
    } catch (requestError) { setError(getApiError(requestError)) }
    finally { setSaving(false) }
  }

  if (!allowed) return null
  return <ModalShell isOpen={isOpen} onClose={close} title="Add Feature" subtitle="Define a new Feature." wide>
    <form className="project-modal-form" onSubmit={submit}>
      <ModalField label="Select Milestone" required><select value={feature.milestone} onChange={event => update('milestone', event.target.value)}><option value="">Select Milestone</option>{milestones.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></ModalField>
      <div className="project-modal-feature-row"><ModalField label="Feature" required><input maxLength={100} value={feature.name} onChange={event => update('name', event.target.value)} placeholder="feature name" /></ModalField><ModalField label="Start date" required><input type="date" value={feature.startDate} onChange={event => update('startDate', event.target.value)} /></ModalField><ModalField label="End date" required><input type="date" min={feature.startDate || undefined} value={feature.dueDate} onChange={event => update('dueDate', event.target.value)} /></ModalField><button className="project-modal-primary" type="submit" disabled={saving || !milestones.length}>{saving ? 'Adding…' : '＋ Add feature'}</button></div>
      {!milestones.length && <p className="project-modal-hint">Create a milestone before adding a feature.</p>}
      {error && <p className="project-modal-error" role="alert">{error}</p>}
    </form>
  </ModalShell>
}
