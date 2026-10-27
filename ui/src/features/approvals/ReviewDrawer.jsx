import { reviewDecision } from './reviewDecision.js'
import { useState } from 'react'
import { errorMessage } from '../../shared/api/apiClient.js'
import { hasSidebarPermission } from '../../layouts/sidebarNavigation.js'
const date = value => value ? new Date(value).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '\u2014'
const label = value => String(value || '').replaceAll('_',' ')

export default function ReviewDrawer({ item: selectedItem, user, onClose, onUpdated }) {
  const [reason, setReason] = useState('')
  const [showReason, setShowReason] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')
  const canEdit = selectedItem.type === 'task' ? selectedItem.can_review === true : ['Admin', 'Administrator'].includes(user.role) || hasSidebarPermission(user.permissions || {}, 'Dependencies', 'Edit')
  const close = () => { if (!saving) onClose() }
  const decide = async (row, action) => {
    if (saving) return
    setSaving(true); setActionError('')
    try {
      await reviewDecision(row, action, reason)

      onUpdated?.(); onClose()
    } catch (error) { setActionError(errorMessage(error)) }
    finally { setSaving(false) }
  }
  return <div className="review-overlay" onClick={() => { if (!saving) close() }}><aside className="review-drawer" data-review-type={selectedItem.type} role="dialog" aria-modal="true" aria-labelledby="review-title" onClick={event => event.stopPropagation()}>
      <header><div className="review-heading-icon">&lt;/&gt;</div><div className="review-heading-content"><div><h2 id="review-title">{selectedItem.title}</h2><span>{selectedItem.type === 'task' ? 'Awaiting Review' : 'Dependency'}</span></div><p>{selectedItem.project_name}{selectedItem.feature_name ? ` · Feature: ${selectedItem.feature_name}` : ''}</p></div><button onClick={close} disabled={saving} aria-label="Close review">×</button></header>
      <div className="review-body">
        <dl><div><dt>Submitted by</dt><dd>{selectedItem.submitted_by}</dd></div><div><dt>Sent</dt><dd>{date(selectedItem.submitted_at)}</dd></div><div><dt>Priority</dt><dd>{label(selectedItem.priority)}</dd></div><div><dt>Due date</dt><dd>{date(selectedItem.due_date)}</dd></div></dl>
        <h3>Description</h3><p className="review-description">{selectedItem.description || 'No description provided.'}</p>
        {selectedItem.submission && <><h3>Submission</h3><p className="review-description">{selectedItem.submission}</p></>}
        {selectedItem.provider_task && <><h3>Provider task</h3><p>{selectedItem.provider_task}</p></>}
        {<><h3>Attachments</h3>{selectedItem.attachments?.length ? selectedItem.attachments.map(file => <a className="review-file" key={file.id} href={file.url} download>{file.name} <span>Download ↓</span></a>) : <p>No files attached.</p>}
          {selectedItem.links?.map(link => <a className="review-file" key={link} href={link} target="_blank" rel="noreferrer">{link} ↗</a>)}</>}
        {actionError && <p role="alert" className="review-error">{actionError}</p>}
        {showReason && <label className="review-reason">{selectedItem.type === 'task' ? 'Describe the changes needed' : 'Reason for declining'}<textarea value={reason} onChange={event => setReason(event.target.value)} maxLength={2000} /></label>}
      </div><footer>{canEdit && <><button className="review-primary" disabled={saving} onClick={() => decide(selectedItem, 'approve')}>{saving ? 'Saving…' : selectedItem.type === 'task' ? 'Approve' : 'Approve dependency'}</button>
        {showReason ? <button disabled={saving || !reason.trim()} onClick={() => decide(selectedItem, 'decline')}>Confirm {selectedItem.type === 'task' ? 'changes' : 'decline'}</button> : <button disabled={saving} onClick={() => setShowReason(true)}>{selectedItem.type === 'task' ? 'Request changes' : 'Decline'}</button>}</>}</footer>
    </aside></div>
}
