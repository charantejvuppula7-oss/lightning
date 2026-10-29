import { useState } from 'react'
import { errorMessage } from '../../shared/api/apiClient.js'
import { chatRequest } from './chatConnection.js'
import { Avatar, FileCard, MessageText } from './ChatElements.jsx'

export default function ChatMessage({ message, user, onReply, members = [], projectId, socket, reaction, onReactionUpdate, onlineIds = [] }) {
  const sender = members.find(person => String(person.id) === String(message.sender))
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [editing,setEditing] = useState(false)
  const [draft,setDraft] = useState('')
  const current = reaction || {count:message.reaction_count || 0,reacted:message.reacted || false}
  const name = sender?.name || message.sender_display_name || message.sender_name || 'Team Member'
  const own = String(message.sender) === String(user.id)
  const toggle = async () => {
    if (busy) return
    setBusy(true); setError('')
    try { onReactionUpdate(message.id,await chatRequest(socket,'reaction',{projectId,messageId:message.id,active:!current.reacted})) }
    catch (error) { setError(errorMessage(error)) }
    finally { setBusy(false) }
  }
  const change = async deleting => {
    if (busy || (deleting && !window.confirm('Delete this message? Replies to it will also be deleted.'))) return
    setBusy(true); setError('')
    try {
      await chatRequest(socket, deleting ? 'delete_message' : 'edit_message', {projectId,messageId:message.id,...(!deleting && {content:draft})})
      setEditing(false)
    } catch (error) { setError(errorMessage(error)) }
    finally { setBusy(false) }
  }
  return <article className={`project-message ${own ? 'own' : ''}`}>
    <Avatar name={name} size={36} isOnline={onlineIds.includes(message.sender)} showBadge />
    <div className="chat-message-body">
      <header><strong>{own ? 'You' : name}</strong><time dateTime={message.created_at}>{new Date(message.created_at).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</time>{!own && ['admin','pm','project manager','administrator'].includes(String(message.sender_role).toLowerCase()) && <span className="chat-role-badge">{String(message.sender_role).toLowerCase().includes('admin') ? 'ADMIN' : 'PM'}</span>}</header>
      {editing ? <form className="flex! flex-col! gap-2!" onSubmit={event => { event.preventDefault(); change(false) }}>
        <textarea aria-label="Edit message" maxLength={10000} value={draft} onChange={event => setDraft(event.target.value)} className="rounded! border! p-2!" autoFocus />
        <div className="flex! gap-2!"><button className="rounded! bg-blue-600! px-3! py-1! text-[13px]! text-white! disabled:opacity-50!" disabled={busy || (!draft.trim() && !message.attachment_url)}>Save</button><button type="button" className="rounded! border! px-3! py-1! text-[13px]!" disabled={busy} onClick={() => setEditing(false)}>Cancel</button></div>
      </form> : message.content && <div className="chat-message-bubble"><MessageText content={message.content} />{message.is_edited && <small className="ml-2! text-[11px]! text-slate-500!">(edited)</small>}</div>}
      {message.attachment_url && <FileCard message={message} />}
      {(onReply || (own && socket)) && <>
        <div className="chat-message-feedback">
          {onReactionUpdate && current.count > 0 && <button className="chat-reaction-count" disabled={busy} onClick={toggle}><span className="material-symbols-outlined">thumb_up</span>{current.count}</button>}
          {onReply && message.thread_count > 0 && <button className="chat-reply-count" onClick={() => onReply(message)}><span className="material-symbols-outlined">forum</span>{message.thread_count} {message.thread_count === 1 ? 'reply' : 'replies'}</button>}
        </div>
        <div className="chat-message-actions">
          {onReply && <><button title="Reply in thread" aria-label="Reply in thread" onClick={() => onReply(message)}><span className="material-symbols-outlined">reply</span></button>
          <button title={current.reacted ? 'Remove Thumbs Up' : 'Thumbs Up'} aria-label="Thumbs Up" disabled={busy} onClick={toggle}><span className="material-symbols-outlined">thumb_up</span></button></>}
          {own && socket && <details className="relative!"><summary aria-label="More options" className="flex! h-[28px]! w-[28px]! cursor-pointer! list-none! items-center! justify-center!"><span className="material-symbols-outlined text-[16px]!">more_horiz</span></summary><div className="absolute! right-0! z-20! flex! min-w-[96px]! flex-col! rounded! border! bg-white! p-1! shadow!">
            <button className="w-full! justify-start! px-2!" disabled={busy} onClick={event => { event.currentTarget.closest('details').open=false; setDraft(message.content); setEditing(true) }}>Edit</button>
            <button className="w-full! justify-start! px-2! text-red-600!" disabled={busy} onClick={event => { event.currentTarget.closest('details').open=false; change(true) }}>Delete</button>
          </div></details>}
        </div>
      </>}
      {error && <small role="alert" className="chat-error">{error}</small>}
    </div>
  </article>
}
