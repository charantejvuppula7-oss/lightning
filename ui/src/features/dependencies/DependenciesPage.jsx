import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useApiData from '../../app/hooks/useApiData.js'
import { useProjectSelection } from '../../app/hooks/useProjectSelection.js'
import { apiList, apiRequest, apiUpload, errorMessage } from '../../services/api/apiClient.js'
import { hasSidebarPermission } from '../../layouts/sidebarNavigation.js'
import { roleSlug } from '../../utils/roles.js'
import { useFeedback } from '../../components/common/Feedback.jsx'
import TaskCard from '../tasks/components/TaskCard.jsx'
import StatusButton from '../tasks/components/StatusButton.jsx'
import ReviewButton from '../tasks/components/ReviewButton.jsx'
import MarkAsCompletedButton from '../tasks/components/MarkAsCompletedButton.jsx'
import TaskReview from '../tasks/components/taskreview.jsx'
import { elapsedSeconds } from '../tasks/taskTime.js'
import AddDependencyModal from '../../components/common/AddDependencyModal.jsx'
import './dependencies.css'

export default function DependenciesPage({ user, searchQuery = '' }) {
  const { selectedProjectId } = useProjectSelection()
  const [params,setParams] = useSearchParams()
  const query = selectedProjectId && selectedProjectId !== 'all' ? `&project=${selectedProjectId}` : ''
  const { data:dependencies, setData:setDependencies, loading, error, reload } = useApiData(`/dependencies/?page_size=100${query}`,[],apiList)
  const manager = ['admin','pm'].includes(roleSlug(user.role))
  const [tab,setTab] = useState(manager ? 'all' : 'waiting_on_other')
  const [now,setNow] = useState(Date.now)
  const { toast,feedback } = useFeedback()
  const canEdit = roleSlug(user.role) === 'admin' || hasSidebarPermission(user.permissions || {}, 'Dependencies','Edit')
  const running = dependencies.some(dep => dep.status === 'in_progress' && dep.start_Time)
  useEffect(() => { if (!running) return; const clock=setInterval(() => setNow(Date.now()),1000); return () => clearInterval(clock) },[running])
  useEffect(() => { const timer=setInterval(reload,30000); return () => clearInterval(timer) },[reload])
  const lists = {
    all:dependencies,
    waiting_on_other:dependencies.filter(dep => String(dep.task_assigned_to_id) === String(user.id)),
    waiting_on_me:dependencies.filter(dep => String(dep.assigned_to) === String(user.id)),
  }
  const target = params.get('dependencyId') || params.get('highlightDependencyId')
  const displayed = lists[tab].filter(dep => !searchQuery || `${dep.description} ${dep.task_name} ${dep.assigned_to_name} ${dep.project_name} ${dep.feature_name}`.toLowerCase().includes(searchQuery.toLowerCase()))
  const created = () => { setParams({}); reload() }
  return <section className="dependencies-page"><header><h1>Dependencies</h1><p>Every link between your work and someone else's, in both directions.</p></header>{feedback}{error && <p role="alert">{error} <button onClick={reload}>Retry</button></p>}
    <nav className="dependency-tabs">{[['all','All Dependencies'],['waiting_on_other',"You're waiting on"],['waiting_on_me','Waiting on you']].filter(([key]) => manager || key !== 'all').map(([key,label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label} ({lists[key].length})</button>)}</nav>
    {loading && !dependencies.length ? <p role="status">Loading dependencies...</p> : !displayed.length ? <div className="dependencies-empty"><span className="material-symbols-outlined">account_tree</span><h3>{searchQuery ? 'No matching dependencies' : tab === 'all' ? 'No dependencies found' : tab === 'waiting_on_other' ? "No dependencies you're waiting on" : 'No one is waiting on you'}</h3><p>{tab === 'all' ? 'There are no dependencies recorded for this project.' : tab === 'waiting_on_other' ? 'When you add a dependency to a task, it will appear here so you can track its progress.' : 'Dependencies assigned to you by teammates will appear here.'}</p></div> : <div className="dependency-list">{displayed.map(dep => <DependencyCard key={dep.id} dep={dep} user={user} canEdit={canEdit} now={now} highlighted={String(dep.id) === target} toast={toast} onUpdated={updated => { setDependencies(previous => previous.map(item => item.id === updated.id ? updated : item)); reload() }} />)}</div>}
    {params.get('taskId') && <DependencyCreateDialog taskId={params.get('taskId')} user={user} onClose={() => setParams({})} onCreated={created} />}
  </section>
}

function DependencyCreateDialog({ taskId,user,onClose,onCreated }) {
  const {data:task,loading,error} = useApiData(`/tasks/${taskId}/`,null)
  const {data:options} = useApiData(task ? `/tasks/options/?project=${task.project}` : null,{members:[]})
  if (error) return <p role="alert">{error} <button onClick={onClose}>Close</button></p>
  if (loading || !task) return <p role="status">Loading task...</p>
  return <AddDependencyModal isOpen user={user} task={task} users={options.members} onClose={onClose} onCreated={onCreated} />
}

function DependencyCard({ dep,user,canEdit,now,highlighted,toast,onUpdated }) {
  const navigate = useNavigate()
  const {setSelectedProjectId} = useProjectSelection()
  const [open,setOpen] = useState(highlighted)
  const [busy,setBusy] = useState(false)
  const [review,setReview] = useState(false)
  const element = useRef(null)
  useEffect(() => { if (highlighted) element.current?.scrollIntoView({block:'center',behavior:'smooth'}) },[highlighted])
  const assigned = String(dep.assigned_to) === String(user.id)
  const running = dep.status === 'in_progress' && dep.start_Time && !dep.pause_Time
  const status = dep.status === 'started' ? 'assigned' : dep.status
  const counterpart = String(dep.task_assigned_to_id) === String(user.id) ? dep.assigned_to_name : dep.task_assigned_to_name
  const base = `/${roleSlug(user.role)}`
  const visit = page => { setSelectedProjectId(dep.project_id); navigate(`${base}/${page}`) }
  const update = async (status,submission) => {
    if (busy) return
    setBusy(true)
    try {
      let result
      if (submission) {
        const form=new FormData(); form.append('status',status); form.append('description',submission.description || ''); form.append('links',JSON.stringify(submission.links || [])); (submission.files || []).forEach(file => form.append('files',file))
        result=await apiUpload(`/dependencies/${dep.id}/status/`,form,{method:'PATCH'})
      } else result=await apiRequest(`/dependencies/${dep.id}/status/`,{method:'PATCH',body:{status}})
      onUpdated(result)
    } catch (error) { toast.error(errorMessage(error)); if (submission) throw error }
    finally { setBusy(false) }
  }
  const nudge = async event => {
    event.stopPropagation(); if (busy) return
    setBusy(true)
    try { const result=await apiRequest(`/dependencies/${dep.id}/nudge/`,{method:'POST',body:{}}); toast.success(result.message); onUpdated(dep) }
    catch (error) { toast.error(errorMessage(error)) }
    finally { setBusy(false) }
  }
  const task = {id:`T${dep.id.replaceAll('-','').slice(0,4).toUpperCase()}`,dbId:dep.id,name:dep.description,status,priority:dep.priority || 'medium',description:dep.description,
    project:dep.project_code || dep.project_name,milestone:dep.milestone_name,feature:dep.feature_name,
    dueDate:dep.due_date ? new Date(dep.due_date).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '',
    timerStatus:running ? 'running' : dep.status === 'completed' ? 'completed' : dep.status === 'paused' ? 'paused' : 'default', timerSeconds:elapsedSeconds(dep,now),
    assignedBy:{name:dep.task_assigned_to_name},assignedTo:[{name:dep.assigned_to_name}],reviewer:dep.review_by ? {id:dep.review_by,name:dep.reviewer_name} : {}}
  const details = <>{dep.submission?.change_requested && <p className="dependency-change">Changes requested: {dep.submission.change_requested}</p>}{dep.history.length > 0 && <div className="dependency-card-history"><h5>Dependency activity</h5>{dep.history.map((item,index) => <div className="dependency-card-history-item" key={index}><span className="dependency-card-history-avatar">{item.author}</span><span><strong>{item.title}</strong><small>{item.date}</small></span></div>)}</div>}</>
  const actions = <>{assigned && canEdit && !['completed','in_review'].includes(dep.status) && (dep.review_by ? <ReviewButton variant="send" disabled={busy || dep.status !== 'in_progress'} onClick={() => setReview(true)}>Send for Review</ReviewButton> : <MarkAsCompletedButton size="sm" disabled={busy || dep.status !== 'in_progress'} label="Mark as Completed" onClick={() => update('completed')} />)}{canEdit && !assigned && dep.assigned_to && <button className="task-card-action-secondary" disabled={busy} onClick={nudge}><span className="material-symbols-outlined">notifications_active</span>Nudge {counterpart?.split(' ')[0]}</button>}<button className="task-card-action-secondary" onClick={() => visit('chat')}><span className="material-symbols-outlined">chat</span>Chat</button></>
  return <div ref={element} className={`dependency-card-wrap ${highlighted ? 'highlighted' : ''}`}><TaskCard task={task} variant="dependency" className="task-card--dependency" toast={toast} subtitle={<span className="dependency-card-subtitle">Under <button className="dependency-card-parent-link" onClick={event => { event.stopPropagation(); visit(`tasks?taskId=${dep.task}`) }}>{dep.task_name}</button></span>} headerAction={<StatusButton status={status} size="sm" variant="badge" />} isAssignedUser={assigned && canEdit && !busy} onTimerToggle={next => update(next === 'paused' ? 'paused' : 'in_progress')} detailsContent={details} detailsActions={actions} isOpen={open} onToggle={(_,next) => setOpen(next)} />{review && <TaskReview toast={toast} isOpen task={dep} onClose={() => setReview(false)} onConfirm={(_,submission) => update('in_review',submission)} />}</div>
}
