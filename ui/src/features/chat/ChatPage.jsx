import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import useApiData from '../../shared/hooks/useApiData.js'
import { useProjectSelection } from '../projects/useProjectSelection.js'
import { apiRequest, errorMessage } from '../../shared/api/apiClient.js'
import { hasSidebarPermission } from '../../layouts/Sidebar.jsx'
import { Avatar, PeopleIcon, PushPinIcon } from './ChatElements.jsx'
import ChatMessage from './ChatMessage.jsx'
import ChatComposer from './ChatComposer.jsx'
import ChatSidebar from './ChatSidebar.jsx'
import { createChatConnection, chatRequest } from './chatConnection.js'

function dateLabel(value) {
  const date=new Date(value); const today=new Date(); const yesterday=new Date(); yesterday.setDate(today.getDate()-1)
  return date.toDateString() === today.toDateString() ? 'Today' : date.toDateString() === yesterday.toDateString() ? 'Yesterday' : date.toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'})
}

export default function ChatPage({ user,searchQuery = '' }) {
  const [socket] = useState(createChatConnection)
  useEffect(() => {
    const reconnect = () => { if (!socket.connected) socket.connect() }
    socket.connect()
    window.addEventListener('online', reconnect)
    window.addEventListener('focus', reconnect)
    return () => {
      window.removeEventListener('online', reconnect)
      window.removeEventListener('focus', reconnect)
      socket.disconnect()
    }
  }, [socket])
  const {projects,selectedProjectId} = useProjectSelection()
  const project=projects.find(project => project.id === selectedProjectId)
  if (!project) return <section className="p-[28px]!"><h1>Project Chat</h1><p>Select a project to open its conversation.</p></section>
  return <ProjectChat key={project.id} project={project} user={user} socket={socket} searchQuery={searchQuery}/>
}

function ProjectChat({ project,user,socket,searchQuery }) {
  const {data:history,loading,error,reload} = useApiData(`/projects/${project.id}/chat/messages/?page_size=100&search=${encodeURIComponent(searchQuery)}`,{results:[],count:0})
  const {data:members} = useApiData(`/projects/${project.id}/chat/members/`,[])
  const [live,setLive] = useState([])
  const [older,setOlder] = useState({query:'',rows:[],page:1,next:null})
  const [loadingOlder,setLoadingOlder] = useState(false)
  const [connection,setConnection] = useState('Connecting...')
  const [activeTab,setActiveTab] = useState('Thread')
  const [panelOpen,setPanelOpen] = useState(false)
  const [membersOpen,setMembersOpen] = useState(false)
  const [pinnedFiles,setPinnedFiles] = useState([])
  const [parent,setParent] = useState(null)
  const [typing,setTyping] = useState([])
  const [online,setOnline] = useState(null)
  const [reactions,setReactions] = useState(null)
  const [newBelow,setNewBelow] = useState(false)
  const bottom=useRef(null)
  const scroll=useRef(null)
  const pendingScroll=useRef(null)
  const atBottom=useRef(true)
  const composer=useRef(null)
  const canUpload=['Admin','Administrator'].includes(user.role) || hasSidebarPermission(user.permissions || {},'Documents','Create')
  const denied=Boolean(error) || connection !== 'Live'
  const onlineIds=online || members.filter(person => person.online).map(person => person.id)
  const onlineCount=members.filter(person => onlineIds.includes(person.id)).length
  const messages=useMemo(() => {
    const olderRows=older.query === searchQuery ? older.rows : []
    const unique=new Map([...history.results,...olderRows,...live].filter(message => !message.parent_message).map(message => [message.id,message]))
    return [...unique.values()].filter(message => !searchQuery || `${message.content} ${message.sender_name} ${message.sender_display_name}`.toLowerCase().includes(searchQuery.toLowerCase())).sort((a,b) => new Date(a.created_at)-new Date(b.created_at))
  },[history.results,older,live,searchQuery])
  useEffect(() => {
    let active = true
    const join = async () => {
      setConnection('Connecting...')
      try {
        await chatRequest(socket, 'join_project', { projectId: project.id })
        if (active) { setConnection('Live'); setLive([]); setReactions(null); reload() }
      } catch (error) { if (active) setConnection(error.message) }
    }
    const created = ({ message, parent }) => {
      setLive(previous => [...previous.filter(item => item.id !== message.id && item.id !== parent?.id), message, ...(parent ? [parent] : [])])
      if (!atBottom.current) setNewBelow(true)
    }
    const presence = data => setOnline(data.online_ids)
    const typingChanged = data => setTyping(previous => {
      const remaining = previous.filter(person => person.user_id !== data.user_id)
      return data.active && data.user_id !== String(user.id) ? [...remaining, data] : remaining
    })
    const reactionChanged = data => setReactions(previous => ({ ...previous, [data.message_id]: { count: data.user_ids.length, reacted: data.user_ids.includes(String(user.id)) } }))
    const disconnected = () => { setConnection('Reconnecting...'); setOnline([]); setTyping([]) }
    const failed = error => setConnection(error.data?.message || 'Unable to connect. Please refresh to retry.')
    const revoked = () => { setConnection('Chat access revoked.'); setLive([]); setOnline([]); setTyping([]) }
    socket.on('connect', join)
    socket.on('disconnect', disconnected)
    socket.on('connect_error', failed)
    socket.on('message_created', created)
    socket.on('presence_changed', presence)
    socket.on('typing_changed', typingChanged)
    socket.on('reaction_changed', reactionChanged)
    socket.on('access_revoked', revoked)
    if (socket.connected) join()
    return () => {
      active = false
      socket.off('connect', join)
      socket.off('disconnect', disconnected)
      socket.off('connect_error', failed)
      socket.off('message_created', created)
      socket.off('presence_changed', presence)
      socket.off('typing_changed', typingChanged)
      socket.off('reaction_changed', reactionChanged)
      socket.off('access_revoked', revoked)
      if (socket.connected) socket.emit('leave_project')
    }
  },[project.id,reload,socket,user.id])
  useEffect(() => { if(atBottom.current) bottom.current?.scrollIntoView({block:'nearest'}) },[messages.length])
  useLayoutEffect(() => {
    const previous=pendingScroll.current
    if(previous && scroll.current && previous.query === searchQuery) {
      scroll.current.scrollTop=previous.top+scroll.current.scrollHeight-previous.height
    }
    pendingScroll.current=null
  },[older,searchQuery])
  useEffect(() => {
    if(!membersOpen) return
    const close=event => { if(!event.target.closest('.chat-members-popover')) setMembersOpen(false) }
    document.addEventListener('pointerdown',close); return () => document.removeEventListener('pointerdown',close)
  },[membersOpen])
  const loadOlder=async () => {
    if(loadingOlder) return
    setLoadingOlder(true)
    try {
      const current=older.query === searchQuery ? older : {rows:[],page:1}
      const page=await apiRequest(`/projects/${project.id}/chat/messages/?page_size=100&page=${current.page+1}&search=${encodeURIComponent(searchQuery)}`)
      if(scroll.current) pendingScroll.current={query:searchQuery,top:scroll.current.scrollTop,height:scroll.current.scrollHeight}
      setOlder({query:searchQuery,rows:[...page.results,...current.rows],page:current.page+1,next:Boolean(page.next)})
    } catch(error) { setConnection(errorMessage(error)) }
    finally { setLoadingOlder(false) }
  }
  const reply=message => { setParent(message); setActiveTab('Thread'); setPanelOpen(true) }
  const openPanel=tab => { setActiveTab(tab); setPanelOpen(true) }
  const mention=person => { setMembersOpen(false); composer.current?.mention(person) }
  const jumpDown=() => { atBottom.current=true; setNewBelow(false); bottom.current?.scrollIntoView({block:'nearest',behavior:'smooth'}) }
  const files=messages.filter(message => message.attachment_url)
  return <section className="company-chat">
    <div className="chat-thread">
      <header className="chat-heading"><div><h1>{project.project_name}</h1><p>Company-wide updates and discussions</p></div>
        <div className="chat-header-actions"><div className="chat-members-popover">
          <button className="chat-member-count" title={`Click to view ${members.length} assigned members (${onlineCount} online)`} onClick={() => setMembersOpen(value => !value)}><span className={`chat-presence-dot ${onlineCount ? 'online' : ''}`} /><PeopleIcon size={18}/><span>{members.length}</span>{onlineCount > 0 && <small>{onlineCount} online</small>}</button>
          {membersOpen && <div className="chat-member-popover-list"><header><strong>Project members ({members.length})</strong><button aria-label="Close members" onClick={() => setMembersOpen(false)}><span className="material-symbols-outlined">close</span></button></header>{members.map(person => <div key={person.id}><Avatar name={person.name || person.user_name} size={30} isOnline={onlineIds.includes(person.id)} showBadge/><span>{person.name || person.user_name}<small>@{person.user_name}</small></span><button title="Mention" aria-label={`Mention ${person.name}`} onClick={() => mention(person)} disabled={denied}>@</button></div>)}<button onClick={() => { setMembersOpen(false); openPanel('Members') }}>View all members</button></div>}
        </div><button className="chat-header-icon" title="Pinned files and messages" aria-label="Pinned files and messages" onClick={() => openPanel('Files')}><PushPinIcon size={18}/></button><button className="chat-header-icon" title="Channel details" aria-label="Channel details" onClick={() => openPanel('Details')}><span className="material-symbols-outlined">more_vert</span></button></div>
      </header>
      <div className="chat-message-scroll"><div ref={scroll} className="live-chat-messages" onScroll={event => { const box=event.currentTarget; atBottom.current=box.scrollHeight-box.scrollTop-box.clientHeight < 120; if(atBottom.current) setNewBelow(false); if(box.scrollTop < 30 && (older.query === searchQuery ? older.next ?? history.next : history.next) && !loading) loadOlder() }}>
        {(older.query === searchQuery ? older.next ?? history.next : history.next) && <button className="chat-load-older" onClick={loadOlder} disabled={loadingOlder}>{loadingOlder ? 'Loading...' : 'Scroll up for more'}</button>}
        {loading && <p role="status">Loading messages...</p>}{error && <p role="alert">{error} <button onClick={reload}>Retry</button></p>}
        {!loading && !messages.length && <div className="chat-empty"><span className="material-symbols-outlined">forum</span><p>{searchQuery ? 'No messages match your search.' : 'No messages yet - start the conversation!'}</p></div>}
        {messages.map((message,index) => <div key={message.id}>{(!index || new Date(messages[index-1].created_at).toDateString() !== new Date(message.created_at).toDateString()) && <div className="chat-date-divider"><span>{dateLabel(message.created_at)}</span></div>}<ChatMessage message={message} user={user} members={members} projectId={project.id} socket={socket} reaction={reactions?.[message.id]} onReactionUpdate={(id,result) => setReactions(previous => ({...previous,[id]:result}))} onReply={reply} onlineIds={onlineIds}/></div>)}<div ref={bottom}/>
      </div>{newBelow && <button className="chat-jump-down" onClick={jumpDown}><span className="material-symbols-outlined">arrow_downward</span>New messages</button>}</div>
      <div className="chat-composer-area">{connection !== 'Live' && <small className="chat-connection" role="status">{connection}</small>}{typing.length > 0 && <small className="chat-typing">{typing.map(person => person.name).join(', ')} is typing...</small>}
        <ChatComposer socket={socket} ref={composer} projectId={project.id} members={members} canUpload={canUpload} disabled={denied} onSent={message => { atBottom.current=true; setLive(previous => [...previous,message]) }}/>
      </div>
    </div>
    {panelOpen && <ChatSidebar tab={activeTab} setTab={setActiveTab} onClose={() => {setPanelOpen(false);setParent(null)}} {...{project,parent,setParent,members,files,pinnedFiles,onlineIds,user,canUpload,socket}} messagesCount={history.count} togglePin={id => setPinnedFiles(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous,id])} onMention={mention} revision={live.length} disabled={denied}/>}
  </section>
}
