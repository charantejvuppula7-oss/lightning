import { useState } from 'react'
import { apiRequest, errorMessage } from '../../shared/api/apiClient.js'
import { Avatar, FileCard, MessageText } from './ChatElements.jsx'

export default function ChatMessage({ message, user, onReply, members = [], projectId, reaction, onReactionUpdate, onlineIds = [] }) {
  const sender = members.find(person => String(person.id) === String(message.sender))
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const current = reaction || {count:message.reaction_count || 0,reacted:message.reacted || false}
  const name = sender?.name || message.sender_display_name || message.sender_name || 'Team Member'
  const own = String(message.sender) === String(user.id)
  const toggle = async () => {
    if (busy) return
    setBusy(true); setError('')
    try { onReactionUpdate(message.id,await apiRequest(`/projects/${projectId}/chat/messages/${message.id}/reaction/`,{method:current.reacted ? 'DELETE' : 'PUT'})) }
    catch (error) { setError(errorMessage(error)) }
    finally { setBusy(false) }
  }
  return <article className={`project-message ${own ? 'own' : ''}`}>
    <Avatar name={name} size={36} isOnline={onlineIds.includes(message.sender)} showBadge />
    <div className="chat-message-body">
      <header><strong>{own ? 'You' : name}</strong><time dateTime={message.created_at}>{new Date(message.created_at).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</time>{!own && ['admin','pm','project manager','administrator'].includes(String(message.sender_role).toLowerCase()) && <span className="chat-role-badge">{String(message.sender_role).toLowerCase().includes('admin') ? 'ADMIN' : 'PM'}</span>}</header>
      {message.content && <div className="chat-message-bubble"><MessageText content={message.content} /></div>}
      {message.attachment_url && <FileCard message={message} />}
      {onReply && <>
        <div className="chat-message-feedback">
          {current.count > 0 && <button className="chat-reaction-count" disabled={busy} onClick={toggle}><span className="material-symbols-outlined">thumb_up</span>{current.count}</button>}
          {message.thread_count > 0 && <button className="chat-reply-count" onClick={() => onReply(message)}><span className="material-symbols-outlined">forum</span>{message.thread_count} {message.thread_count === 1 ? 'reply' : 'replies'}</button>}
        </div>
        <div className="chat-message-actions">
          <button title="Reply in thread" aria-label="Reply in thread" onClick={() => onReply(message)}><span className="material-symbols-outlined">reply</span></button>
          <button title={current.reacted ? 'Remove Thumbs Up' : 'Thumbs Up'} aria-label="Thumbs Up" disabled={busy} onClick={toggle}><span className="material-symbols-outlined">thumb_up</span></button>
          <button title="More options" aria-label="More options"><span className="material-symbols-outlined">more_horiz</span></button>
        </div>
      </>}
      {error && <small role="alert" className="chat-error">{error}</small>}
    </div>
  </article>
}
