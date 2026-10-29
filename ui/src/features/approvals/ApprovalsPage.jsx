import { reviewDecision } from './reviewDecision.js'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import useApiData from '../../shared/hooks/useApiData.js'
import { useProjectSelection } from '../projects/useProjectSelection.js'
import { errorMessage } from '../../shared/api/apiClient.js'
import { useFeedback } from '../../shared/components/Feedback.jsx'
import { hasSidebarPermission } from '../../layouts/Sidebar.jsx'
import ReviewDrawer from './ReviewDrawer.jsx'
import { SearchBar, FilterSelect } from '../../shared/components/SearchControls.jsx'
const date = value => value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const label = value => String(value || '').replaceAll('_', ' ')
export default function ApprovalsPage({ user }) {
  const { projects, selectedProjectId, setSelectedProjectId } = useProjectSelection()
  const projectQuery = selectedProjectId && selectedProjectId !== 'all' ? `?project=${selectedProjectId}` : ''
  const { data, loading, error, reload } = useApiData(`/approvals/${projectQuery}`, { reviews: [], dependencies: [] })
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState(() => params.get('reviewKind') === 'dependency' ? 'dependency' : 'task')
  const [search, setSearch] = useState('')
  const [member, setMember] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const { toast, feedback } = useFeedback()
  const rows = tab === 'task' ? data.reviews : data.dependencies
  const filtered = rows.filter(row => (!search || `${row.title} ${row.project_name} ${row.submitted_by}`.toLowerCase().includes(search.toLowerCase())) &&
    (!member || row.submitted_by === member) && (!status || (tab === 'dependency' ? row.priority : row.status) === status))
  const totalPages = Math.max(1, Math.ceil(filtered.length / 10))
  const currentPage = Math.min(page, totalPages)
  const candidate = selected || [...data.reviews, ...data.dependencies].find(row => String(row.id) === params.get('reviewId'))
  const selectedItem = candidate && (!selectedProjectId || selectedProjectId === 'all' || candidate.project_id === selectedProjectId) ? candidate : null
  const canEdit = row => row.type === 'task' ? row.can_review === true : ['Admin', 'Administrator'].includes(user.role) || hasSidebarPermission(user.permissions || {}, 'Dependencies', 'Edit')
  const close = () => { setSelected(null); setParams({}) }
  const decide = async (row, action) => {
    if (saving) return
    setSaving(true)
    try {
      await reviewDecision(row, action)

      close(); reload(); toast.success(action === 'approve' ? 'Approved successfully.' : row.type === 'task' ? 'Changes requested.' : 'Dependency declined and paused.')
    } catch (error) { toast.error(errorMessage(error)) }
    finally { setSaving(false) }
  }
  return <section className="approvals-page">
    <h1>Approvals</h1><p className="approval-subtitle">Everything waiting on a decision from you. Approve straight from the table, or open a row when you need the detail.</p>
    {feedback}{error && <p role="alert">{error} <button onClick={reload}>Retry</button></p>}
    <div className="approval-metrics">
      {[['Awaiting Approvals', data.reviews.length + data.dependencies.length, 'folder', 'purple', 'Needs your feedback'],
        ['Awaiting Review', data.reviews.length, 'assignment_turned_in', 'green', 'Under review'],
        ['Blocking', data.dependencies.length, 'block', 'blue', 'Task Block'],
        ['Overdue Approvals', [...data.reviews, ...data.dependencies].filter(row => row.due_date && new Date(row.due_date) < new Date(new Date().toDateString())).length, 'star', 'red', 'Urgent']].map(([title, count, icon, color, caption]) =>
        <article key={title} className={color}><span aria-hidden="true"><span className="material-symbols-outlined">{icon}</span></span><div><p>{title}</p><strong>{count}</strong><small>{caption}</small></div></article>)}
    </div>
    <div className="approval-tabs">{[['task', 'Work Review', data.reviews.length], ['dependency', 'Dependency', data.dependencies.length]].map(([key, title, count]) =>
      <button key={key} className={tab === key ? 'active' : ''} onClick={() => { setTab(key); setPage(1); setStatus(''); setMember('') }}>{title} ({count})</button>)}
    </div>
    <div className="approval-filters">
      <SearchBar aria-label="Search approvals" placeholder={tab === 'task' ? 'Search document' : 'Search request'} value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} wrapperClassName="relative w-[300px] max-w-full" />
      <FilterSelect aria-label="Filter project" value={selectedProjectId || 'all'} onChange={event => { setSelectedProjectId(event.target.value); setPage(1); setMember(''); setStatus('') }}><option value="all">All projects</option>{projects.map(project => <option key={project.id} value={project.id}>{project.project_name}</option>)}</FilterSelect>
      <FilterSelect aria-label="Filter members" value={member} onChange={event => { setMember(event.target.value); setPage(1) }}><option value="">Members</option>{[...new Set(rows.map(row => row.submitted_by))].map(name => <option key={name}>{name}</option>)}</FilterSelect>
      <FilterSelect aria-label={tab === 'dependency' ? 'Filter urgency' : 'Filter status'} value={status} onChange={event => { setStatus(event.target.value); setPage(1) }}><option value="">{tab === 'dependency' ? 'Urgency' : 'Status'}</option>{[...new Set(rows.map(row => tab === 'dependency' ? row.priority : row.status))].map(value => <option key={value} value={value}>{label(value)}</option>)}</FilterSelect>
      <button onClick={() => { setSearch(''); setMember(''); setStatus(''); setPage(1) }}>Clear</button><button onClick={reload} aria-label="Refresh approvals">↻</button>
    </div><div className="approval-table-card"><div className="approval-table-scroll"><table><thead><tr>{(tab === 'task' ? ['Work Item', 'Milestone/Feature', 'Submitted by', 'Sent', 'Status', 'Actions'] : ['Request', 'Requested by', 'Impact', 'Urgency', 'Sent', 'Action']).map(name => <th key={name}>{name}</th>)}</tr></thead>
      <tbody>{loading ? <tr><td colSpan={6}>Loading approvals…</td></tr> : filtered.length ? filtered.slice((currentPage - 1) * 10, currentPage * 10).map(row =>
        <tr key={row.id}><td><button className="approval-row-title" onClick={() => { setSelected(row) }}>{row.title}</button><small>{row.project_name}</small></td>
          {tab === 'task' ? <><td>{row.milestone_name || '—'}<small>{row.feature_name || '—'}</small></td><td>{row.submitted_by}<small>{row.role}</small></td><td>{date(row.submitted_at)}</td><td><span className="approval-status">Awaiting Review</span></td></> : <><td>{row.submitted_by}<small>{row.role || 'Team Member'}</small></td><td>{row.dependency_type === 'mandatory' ? `Blocks ${row.task_name}` : row.task_name}</td><td><span className={`approval-priority ${row.priority}`}>{label(row.priority)}</span></td><td>{date(row.submitted_at)}</td></>}<td><div className="approval-row-actions">{tab === 'dependency' ? <>
            {canEdit(row) && <button className="approval-icon-action text-green-600!" aria-label="Resolve dependency" title="Resolve dependency" disabled={saving} onClick={() => decide(row, 'approve')}><span className="material-symbols-outlined">check_circle</span></button>}
            <button className="approval-icon-action" aria-label="View details" title="View details" onClick={() => setSelected(row)}><span className="material-symbols-outlined">visibility</span></button>
          </> : <button onClick={() => setSelected(row)}>Review</button>}</div></td></tr>) : <tr><td className="text-center! p-[32px]! text-[#64748b]!" colSpan={6}>No items awaiting your decision.</td></tr>}</tbody>
    </table></div></div><footer className="approval-pagination">Showing {filtered.length ? (currentPage - 1) * 10 + 1 : 0} to {Math.min(currentPage * 10, filtered.length)} of {filtered.length} {tab === 'task' ? 'reviews' : 'requests'}<div><button disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>‹</button><span>{currentPage}</span><button disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>›</button></div></footer>
    {selectedItem && <ReviewDrawer key={selectedItem.id} item={selectedItem} user={user} toast={toast} onClose={close} onUpdated={reload} />}
  </section>
}
