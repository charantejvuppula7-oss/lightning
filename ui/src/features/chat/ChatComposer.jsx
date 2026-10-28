import { useImperativeHandle, useRef, useState } from 'react'
import { apiUpload, errorMessage } from '../../shared/api/apiClient.js'
import { chatRequest } from './chatConnection.js'
import { Avatar, FileIcon } from './ChatElements.jsx'

async function compressImage(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 1024*1024) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1,1280/bitmap.width)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width*scale); canvas.height = Math.round(bitmap.height*scale)
    canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height); bitmap.close()
    const blob = await new Promise(resolve => canvas.toBlob(resolve,file.type,.8))
    return blob && blob.size < file.size ? new File([blob],file.name,{type:file.type,lastModified:file.lastModified}) : file
  } catch { return file }
}

const emojiChoices = [0x1f642,0x1f44d,0x1f389,0x2705,0x1f64f,0x1f44f,0x1f680,0x2764].map(value => String.fromCodePoint(value))

export default function ChatComposer({ projectId, parentId, onSent, canUpload, members, socket, ref, disabled = false }) {
  const [text,setText] = useState('')
  const [attachment,setAttachment] = useState(null)
  const [saving,setSaving] = useState(false)
  const [error,setError] = useState('')
  const [mention,setMention] = useState(null)
  const [mentionIndex,setMentionIndex] = useState(0)
  const [emojiOpen,setEmojiOpen] = useState(false)
  const fileInput = useRef(null)
  const textarea = useRef(null)
  const pendingId = useRef(null)
  const lastTyping = useRef(0)
  const candidates = mention ? members.filter(person => `${person.name} ${person.user_name}`.toLowerCase().includes(mention.query.toLowerCase())).slice(0,8) : []
  const resize = () => { const input=textarea.current; if(input) { input.style.height='auto'; input.style.height=`${Math.min(input.scrollHeight,120)}px` } }
  const insert = (value,start=textarea.current?.selectionStart ?? text.length,end=textarea.current?.selectionEnd ?? text.length) => {
    setText(text.slice(0,start)+value+text.slice(end)); setEmojiOpen(false)
    requestAnimationFrame(() => { textarea.current?.focus(); textarea.current?.setSelectionRange(start+value.length,start+value.length); resize() })
  }
  useImperativeHandle(ref,() => ({mention:person => insert(`@${person.user_name} `)}))
  const pickMember = person => { insert(`@${person.user_name} `,mention.start,mention.end); setMention(null) }
  const format = marker => { const start=textarea.current.selectionStart; const end=textarea.current.selectionEnd; insert(`${marker}${text.slice(start,end)}${marker}`,start,end) }
  const send = async event => {
    event.preventDefault()
    if (disabled || saving || (!text.trim() && !attachment)) return
    setSaving(true); setError('')
    const signature=JSON.stringify([text.trim(),parentId,attachment?.file.name,attachment?.file.size])
    if (pendingId.current?.signature !== signature) pendingId.current={signature,id:crypto.randomUUID()}
    try {
      let documentId=attachment?.documentId
      if (attachment && !documentId) {
        const form=new FormData(); form.append('project',projectId); form.append('file',await compressImage(attachment.file))
        const document=await apiUpload('/documents/',form); documentId=document.id
        setAttachment(previous => previous && {...previous,documentId})
      }
      const {message}=await chatRequest(socket,'send_message',{projectId,content:text.trim(),client_id:pendingId.current.id,...(parentId ? {parent_message_id:parentId}:{}),...(documentId ? {attachment_id:documentId}:{})})
      onSent(message); setText(''); setAttachment(null); setMention(null); pendingId.current=null
      socket.emit('typing',{projectId,active:false})
      requestAnimationFrame(resize)
    } catch (error) { setError(errorMessage(error)) }
    finally { setSaving(false) }
  }
  const change = event => {
    const value=event.target.value; const caret=event.target.selectionStart
    setText(value); resize(); setMentionIndex(0)
    const prefix=value.slice(0,caret); const match=prefix.match(/(?:^|\s)@([^\s@]*)$/)
    setMention(match ? {start:prefix.lastIndexOf('@'),end:caret,query:match[1]} : null)
    if (Date.now()-lastTyping.current > 1500 || !value) {
      lastTyping.current=Date.now()
      if (socket.connected) socket.emit('typing',{projectId,active:Boolean(value)})
    }
  }
  const keyDown = event => {
    if (mention && candidates.length) {
      if (event.key === 'Escape') { event.preventDefault(); setMention(null); return }
      if (['ArrowDown','ArrowUp'].includes(event.key)) { event.preventDefault(); setMentionIndex(value => (value+(event.key === 'ArrowDown' ? 1 : candidates.length-1))%candidates.length); return }
      if (['Enter','Tab'].includes(event.key)) { event.preventDefault(); pickMember(candidates[mentionIndex % candidates.length]); return }
    }
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(event) }
  }
  return <form className={`live-composer ${parentId ? 'thread-composer' : ''}`} onSubmit={send}>
    {error && <p role="alert" className="chat-error">{error}</p>}
    {attachment && <div className="chat-attached"><FileIcon name={attachment.file.name} size={20}/><span>{attachment.file.name} ({Math.round(attachment.file.size/1024)} KB)</span><button type="button" disabled={saving} onClick={() => setAttachment(null)} aria-label="Remove attachment">&times;</button></div>}
    {mention && candidates.length > 0 && <div className="chat-mention-suggestions" role="listbox" aria-label="Mention a member">{candidates.map((person,index) => <button type="button" role="option" aria-selected={index === mentionIndex} key={person.id} onClick={() => pickMember(person)}><Avatar name={person.name || person.user_name} size={28} /><span>{person.name || person.user_name}<small>@{person.user_name}</small></span></button>)}</div>}
    <textarea ref={textarea} aria-label={parentId ? 'Thread reply' : 'Message'} placeholder={parentId ? 'Reply...' : 'Type a message...'} value={text} disabled={saving || disabled} onChange={change} onKeyDown={keyDown} maxLength={10000}/>
    <div className="composer-actions">
      {canUpload && !parentId && <><input ref={fileInput} type="file" hidden onChange={event => { const file=event.target.files[0]; if(file) setAttachment({file}); event.target.value='' }} /><button type="button" title="Attach file" aria-label="Attach file" disabled={saving || disabled} onClick={() => fileInput.current.click()}><span className="material-symbols-outlined">add</span></button></>}
      <div className="chat-emoji-menu"><button type="button" title="Emoji" aria-label="Emoji" disabled={saving || disabled} onClick={() => setEmojiOpen(value => !value)}><span className="material-symbols-outlined">sentiment_satisfied</span></button>{emojiOpen && <div>{emojiChoices.map(emoji => <button key={emoji} type="button" onClick={() => insert(emoji)}>{emoji}</button>)}</div>}</div>
      {!parentId && <><button type="button" title="Mention" aria-label="Mention" disabled={saving || disabled} onClick={() => { const start=textarea.current.selectionStart; insert('@'); setMention({start,end:start+1,query:''}); setMentionIndex(0) }}>@</button><button type="button" title="Bold" className="chat-format-bold" disabled={saving || disabled} onClick={() => format('**')}>B</button><button type="button" title="Italic" className="chat-format-italic" disabled={saving || disabled} onClick={() => format('_')}>I</button></>}
      <button className="send-button" aria-label="Send" disabled={saving || disabled || (!text.trim() && !attachment)}><span className="material-symbols-outlined">{saving ? 'progress_activity' : 'send'}</span></button>
    </div>
  </form>
}
