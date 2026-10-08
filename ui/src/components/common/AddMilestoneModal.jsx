import { useState } from 'react'
import { apiRequest } from '../../services/api/apiClient.js'
import { ModalField, ModalShell } from './ProjectModal.jsx'
import { canUsePermission, getApiError } from './modalUtils.js'

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
  "project-modal-primary": [
    "[min-height:48px]",
    "[padding:10px_22px]",
    "[border:1px_solid_#d1d9e5]",
    "[border-radius:8px]",
    "[background:#fff]",
    "[color:#334155]",
    "[font:inherit]",
    "[font-size:15px]",
    "[font-weight:650]",
    "[cursor:pointer]",
    "[display:inline-flex]",
    "[align-items:center]",
    "[justify-content:center]",
    "[gap:8px]",
    "[border-color:#2169df]",
    "[background:#2169df]",
    "[color:#fff]",
    "[&:disabled]:[cursor:wait]",
    "[&:disabled]:[opacity:.6]"
  ],
  "project-modal-error": [
    "[margin:0]",
    "[color:#b91c1c]",
    "[font-size:13px]"
  ],
  "project-modal-date-row": [
    "[display:grid]",
    "[grid-template-columns:repeat(2,minmax(0,1fr))_auto]",
    "[gap:14px]",
    "[align-items:end]",
    "max-[700px]:[grid-template-columns:1fr]"
  ]
}
const styling = value => {
  const classes = typeof value === 'string' ? value : ''
  const utilities = classes.split(/\s+/).flatMap(name => tailwindStyling[name] || [])
  return [...new Set([...classes.split(/\s+/), ...utilities])].filter(Boolean).join(' ')
}



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
    <form className={styling("project-modal-form")} onSubmit={submit}>
      <ModalField label="Milestone" required><input maxLength={100} value={milestone.name} onChange={event => update('name', event.target.value)} placeholder="Add Milestone" /></ModalField>
      <ModalField label="Description (optional)"><textarea rows={3} value={milestone.description} onChange={event => update('description', event.target.value)} placeholder="Add a description" /></ModalField>
      <div className={styling("project-modal-date-row")}><ModalField label="Start date" required><input type="date" value={milestone.startDate} onChange={event => update('startDate', event.target.value)} /></ModalField><ModalField label="End date" required><input type="date" min={milestone.startDate || undefined} value={milestone.dueDate} onChange={event => update('dueDate', event.target.value)} /></ModalField><button className={styling("project-modal-primary")} type="submit" disabled={saving || !projectId}>{saving ? 'Adding…' : '＋ Add Milestone'}</button></div>
      {error && <p className={styling("project-modal-error")} role="alert">{error}</p>}
    </form>
  </ModalShell>
}
