import { useEffect, useRef, useState } from 'react'
import useApiData from '../../shared/hooks/useApiData.js'
import { Avatar, FileCard } from './ChatElements.jsx'
import ChatMessage from './ChatMessage.jsx'
import ChatComposer from './ChatComposer.jsx'

export default function ChatSidebar({ tab, setTab, onClose, project, parent, setParent, members, files, messagesCount, pinnedFiles, togglePin, onlineIds, onMention, user, canUpload, revision, disabled }) {
  const [fileTab,setFileTab] = useState('Pinned')
  const [search,setSearch] = useState('')
  const activeFiles = fileTab === 'Pinned' ? files.filter(file => pinnedFiles.includes(file.id)) : files
  return <aside className="live-chat-details">
    <div className="detail-tabs">{['Thread','Files','Members','Details'].map(name => <button key={name} className={tab === name ? 'selected' : ''} onClick={() => setTab(name)}>{name}{name === 'Files' ? ` (${files.length})` : name === 'Members' ? ` (${members.length})` : ''}</button>)}<button aria-label="Close side panel" onClick={onClose}><span className="material-symbols-outlined">close</span></button></div>
    {tab === 'Thread' && (parent ? <><button className="chat-back" onClick={() => setParent(null)}><span className="material-symbols-outlined">arrow_back</span>Back to message</button><Thread key={parent.id} {...{project,parent,user,members,canUpload,revision,disabled}} /></> : <PanelEmpty icon="reply">Hover a message and click Reply to open a thread</PanelEmpty>)}
    {tab === 'Files' && <><div className="chat-file-tabs">{['Pinned','All'].map(name => <button key={name} className={fileTab === name ? 'selected' : ''} onClick={() => setFileTab(name)}>{name === 'Pinned' ? `Pinned (${pinnedFiles.length})` : `All Files (${files.length})`}</button>)}</div><div className="chat-files">{activeFiles.map(message => <FileCard key={message.id} message={message} pinned={pinnedFiles.includes(message.id)} onPin={() => togglePin(message.id)} />)}{!activeFiles.length && <PanelEmpty icon="folder_open">{fileTab === 'Pinned' ? 'No pinned files yet' : 'No files shared yet'}</PanelEmpty>}</div></>}
    {tab === 'Members' && <><div className="chat-member-search"><span className="material-symbols-outlined">search</span><input aria-label="Search members" placeholder="Search members..." value={search} onChange={event => setSearch(event.target.value)} /></div><div className="chat-member-list"><h3>PROJECT MEMBERS ({members.length})</h3>{members.filter(person => `${person.name} ${person.user_name}`.toLowerCase().includes(search.toLowerCase())).map(person => <article key={person.id}><Avatar name={person.name || person.user_name} size={34} isOnline={onlineIds.includes(person.id)} showBadge /><div><strong>{person.name || person.user_name}{String(person.id) === String(user.id) && <small>You</small>}</strong><small>@{person.user_name}{person.designation ? ` - ${person.designation}` : ''}</small></div><button title="Mention" aria-label={`Mention ${person.name}`} onClick={() => onMention(person)} disabled={disabled}>@ Mention</button></article>)}</div></>}
    {tab === 'Details' && <div className="chat-channel-details">{[['Project',project.project_name],['Chat Type','Project Team Chat'],['Access','Team members only'],['Files Shared',files.length],['Messages',messagesCount]].map(([label,value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>}
  </aside>
}

function PanelEmpty({ icon,children }) {
  return <div className="chat-panel-empty"><span className="material-symbols-outlined">{icon}</span><p>{children}</p></div>
}

function Thread({ project,parent,user,members,canUpload,revision,disabled }) {
  const [page,setPage] = useState(1)
  const {data,loading,error,reload} = useApiData(`/projects/${project.id}/chat/messages/${parent.id}/thread/?page_size=100&page=${page}&revision=${revision}`,{results:[]})
  const bottom=useRef(null)
  useEffect(() => { bottom.current?.scrollIntoView({block:'nearest'}) },[data.results.length])
  return <div className="live-thread"><div className="thread-messages">
    <div className="thread-parent-card"><ChatMessage message={parent} user={user} members={members}/></div>
    {loading && <p role="status">Loading replies...</p>}{error && <p role="alert">{error}</p>}
    {data.results.map(message => <ChatMessage key={message.id} message={message} user={user} members={members}/>)}
    {(page > 1 || data.next) && <div><button disabled={page === 1} onClick={() => setPage(page-1)}>Previous replies</button><button disabled={!data.next} onClick={() => setPage(page+1)}>More replies</button></div>}
    <div ref={bottom}/>
  </div><ChatComposer projectId={project.id} parentId={parent.id} members={members} canUpload={canUpload} onSent={reload} disabled={disabled}/></div>
}
