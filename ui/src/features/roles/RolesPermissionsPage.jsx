import { useState } from 'react'
import useApiData from '../../shared/hooks/useApiData.js'
import { apiList, apiRequest, errorMessage } from '../../shared/api/apiClient.js'
import { hasSidebarPermission } from '../../layouts/Sidebar.jsx'
import { roleSlug } from '../../shared/utils/roles.js'
import { useFeedback } from '../../shared/components/Feedback.jsx'
import { permissionSchema } from '../../shared/utils/permissions.js'

const modules = Object.keys(permissionSchema)
const labels = { 'Roles & permissions':'Roles & Permissions', 'Department Managment':'Department Management', TeamWorLoad:'Team Workload', ProjectJourney:'Project Journey', ProjectPerformanceGraph:'Project Performance Graph', MilestoneMap:'Milestone Map', TeamStatus:'Team Status', recentActvities:'Recent Activities' }
const actions = ['View','Create','Edit','Delete']

export default function RolesPermissionsPage({ user, searchQuery = '' }) {
  const { data: roles, setData: setRoles, loading, error, reload } = useApiData('/roles/', [], apiList)
  const { data: schema, error: schemaError } = useApiData('/roles/schema/', {})
  const [selectedId, setSelectedId] = useState(null)
  const [editor, setEditor] = useState(null)
  const [saving, setSaving] = useState(false)
  const { toast, feedback } = useFeedback()
  const admin = roleSlug(user.role) === 'admin'
  const can = action => admin || hasSidebarPermission(user.permissions || {}, 'Roles & permissions', action)
  const active = roles.find(role => role.id === selectedId) || roles[0]
  const adminRole = active && ['admin','administrator'].includes(active.name.toLowerCase())
  const protectedRole = active && (active.is_locked || ['admin','administrator'].includes(active.name.toLowerCase()))
  const updateRole = role => setRoles(previous => previous.map(item => item.id === role.id ? role : item))
  const toggle = async (module, action) => {
    if (saving || !can('Edit') || (protectedRole && !admin)) return
    setSaving(true)
    try {
      const permissions = { ...active.permissions, [module]: { ...active.permissions[module], [action]: !active.permissions[module]?.[action] } }
      updateRole(await apiRequest(`/roles/${active.id}/`, { method:'PATCH', body:{ permissions } }))
      window.dispatchEvent(new Event('session:changed'))
    } catch (error) { toast.error(errorMessage(error)) }
    finally { setSaving(false) }
  }
  const remove = async () => {
    if (!window.confirm(`Are you sure you want to delete role "${active.name}"?`)) return
    setSaving(true)
    try { await apiRequest(`/roles/${active.id}/`, { method:'DELETE' }); setRoles(previous => previous.filter(item => item.id !== active.id)); setSelectedId(null); toast.success('Role deleted.') }
    catch (error) { toast.error(errorMessage(error)) }
    finally { setSaving(false) }
  }
  return <section className="roles-page">
    <header className="roles-title-row"><div><h1>Roles & permissions</h1><p>Pick a role on the left, tick what it can do on the right.</p></div><div><button onClick={reload}><span className="material-symbols-outlined">refresh</span>Refresh</button>{can('Create') && <button className="roles-primary" onClick={() => setEditor({})}>+ Add Role</button>}</div></header>
    {feedback}{(error || schemaError) && <p role="alert">{error || schemaError}</p>}
    {loading && !roles.length ? <p role="status">Loading roles & permissions...</p> : !roles.length ? <p>No roles found. Click "+ Add Role" to create one.</p> : <div className="roles-grid">
      <nav aria-label="Roles">{roles.filter(role => `${role.name} ${role.description}`.toLowerCase().includes(searchQuery.toLowerCase())).map(role => <button key={role.id} className={`role-nav-item ${active?.id === role.id ? 'active' : ''}`} onClick={() => setSelectedId(role.id)}><span className="role-color" style={{ backgroundColor:role.color || '#93c5fd' }} /><span><strong>{role.name}</strong><small>{role.user_count} user{role.user_count !== 1 ? 's' : ''}</small></span></button>)}</nav>
      {active && <div className="roles-matrix-column"><header className="role-meta"><div><h2>{active.name} {saving && <small>Saving...</small>}</h2><p>{active.description || 'No description provided.'}</p></div><div>{can('Edit') && (!protectedRole || admin) && <button aria-label="Edit role" onClick={() => setEditor(active)}><span className="material-symbols-outlined">edit</span></button>}{can('Delete') && !protectedRole && <button aria-label="Delete role" onClick={remove} disabled={saving}><span className="material-symbols-outlined">delete</span></button>}</div></header>
        <div className="permission-matrix" role="table" aria-label={`${active.name} permissions`}><div className="permission-row permission-head" role="row"><span role="columnheader">Module</span>{actions.map(action => <span key={action} role="columnheader">{action}</span>)}</div><div className="permission-section">Modules & Resources</div>
          {modules.filter(module => schema[module]).map(module => <div className="permission-row" role="row" key={module}><strong role="rowheader">{labels[module] || module}</strong>{actions.map(action => <span role="cell" key={action}>{schema[module].includes(action) ? <input type="checkbox" aria-label={`${action} permission for ${labels[module] || module}`} checked={adminRole || active.permissions[module]?.[action] === true} disabled={adminRole || !can('Edit') || saving || protectedRole && !admin} onChange={() => toggle(module,action)} /> : <span className="permission-na">—</span>}</span>)}</div>)}
        </div>
      </div>}
    </div>}
    {editor && <RoleEditor role={editor} onClose={() => setEditor(null)} onSaved={role => { if (editor.id) updateRole(role); else setRoles(previous => [...previous,role]); setSelectedId(role.id); setEditor(null) }} />}
  </section>
}

function RoleEditor({ role, onClose, onSaved }) {
  const [name, setName] = useState(role.name || '')
  const [description, setDescription] = useState(role.description || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const save = async event => {
    event.preventDefault(); setSaving(true); setError('')
    try { onSaved(await apiRequest(role.id ? `/roles/${role.id}/` : '/roles/', { method:role.id ? 'PATCH' : 'POST', body:{ name:name.trim(), description:description.trim() } })) }
    catch (error) { setError(errorMessage(error)) }
    finally { setSaving(false) }
  }
  return <div className="role-modal-overlay" onClick={() => { if (!saving) onClose() }}><form className="role-modal" role="dialog" aria-modal="true" aria-labelledby="role-editor-title" onClick={event => event.stopPropagation()} onSubmit={save}><header><h3 id="role-editor-title">{role.id ? 'Edit role' : 'Add role'}</h3><button type="button" aria-label="Close role editor" onClick={onClose} disabled={saving}>×</button></header><label>Role name *<input required maxLength={100} placeholder="e.g. Lead Engineer" value={name} onChange={event => setName(event.target.value)} /></label><label>Description<input placeholder="e.g. Manages technical architecture and code reviews." value={description} onChange={event => setDescription(event.target.value)} /></label>{error && <p role="alert">{error}</p>}<footer><button type="button" onClick={onClose} disabled={saving}>Cancel</button><button className="roles-primary" disabled={saving || !name.trim()}>{saving ? 'Saving...' : role.id ? 'Save changes' : 'Add role'}</button></footer></form></div>
}
