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
  "project-modal-feature-row": [
    "[display:grid]",
    "[grid-template-columns:minmax(180px,1fr)_minmax(145px,.8fr)_minmax(145px,.8fr)_auto]",
    "[gap:14px]",
    "[align-items:end]",
    "[padding:20px]",
    "[border:1px_solid_#dbe4ef]",
    "[border-radius:11px]",
    "max-[700px]:[grid-template-columns:1fr]",
    "max-[700px]:[padding:14px]"
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
  "project-modal-hint": [
    "[margin:0]",
    "[color:#64748b]",
    "[font-size:13px]"
  ],
  "feature-row": [
    "[&_strong]:[font-size:16px]",
    "[&_strong]:[font-weight:600]",
    "[&_small]:[color:#727783]",
    "[&_small]:[font-size:13px]",
    "[display:flex]",
    "[min-height:70px]",
    "[box-sizing:border-box]",
    "[align-items:center]",
    "[gap:14px]",
    "[padding:10px_22px]",
    "[&_>_span:nth-child(2)]:[display:flex]",
    "[&_>_span:nth-child(2)]:[min-width:0]",
    "[&_>_span:nth-child(2)]:[flex:1]",
    "[&_>_span:nth-child(2)]:[flex-direction:column]",
    "[&_>_span:nth-child(2)]:[gap:4px]",
    "[&_.milestone-meter]:[margin-left:auto]",
    "max-[650px]:[gap:7px]",
    "max-[650px]:[padding-inline:9px]",
    "max-[650px]:[&_strong]:[font-size:13px]",
    "max-[650px]:[&_small]:[font-size:10px]"
  ]
}
const styling = value => {
  const classes = typeof value === 'string' ? value : ''
  const utilities = classes.split(/\s+/).flatMap(name => tailwindStyling[name] || [])
  return [...new Set([...classes.split(/\s+/), ...utilities])].filter(Boolean).join(' ')
}



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
    <form className={styling("project-modal-form")} onSubmit={submit}>
      <ModalField label="Select Milestone" required><select value={feature.milestone} onChange={event => update('milestone', event.target.value)}><option value="">Select Milestone</option>{milestones.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></ModalField>
      <div className={styling("project-modal-feature-row")}><ModalField label="Feature" required><input maxLength={100} value={feature.name} onChange={event => update('name', event.target.value)} placeholder="feature name" /></ModalField><ModalField label="Start date" required><input type="date" value={feature.startDate} onChange={event => update('startDate', event.target.value)} /></ModalField><ModalField label="End date" required><input type="date" min={feature.startDate || undefined} value={feature.dueDate} onChange={event => update('dueDate', event.target.value)} /></ModalField><button className={styling("project-modal-primary")} type="submit" disabled={saving || !milestones.length}>{saving ? 'Adding…' : '＋ Add feature'}</button></div>
      {!milestones.length && <p className={styling("project-modal-hint")}>Create a milestone before adding a feature.</p>}
      {error && <p className={styling("project-modal-error")} role="alert">{error}</p>}
    </form>
  </ModalShell>
}
