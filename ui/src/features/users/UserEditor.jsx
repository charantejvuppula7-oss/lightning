import { useEffect, useState } from 'react'
import { apiRequest, errorMessage } from '../../shared/api/apiClient.js'

export default function UserEditor({ initial, projectId, onClose, onSaved }) {
  const editing = Boolean(initial.id)
  const [options, setOptions] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(() => ({
    user_name: initial.user_name || '', employee_id: initial.employee_id || '',
    first_name: initial.first_name || '', last_name: initial.last_name || '', email: initial.email || '',
    password: '', role_link: initial.role_link || '', department: initial.department || '',
    designation: initial.designation || '', date_of_joining: initial.date_of_joining || '',
    employment_type: initial.employment_type || 'full_time', phone_number: initial.phone_number || '',
    location: initial.location || '', account_status: initial.account_status || 'active',
  }))
  useEffect(() => {
    let active = true
    apiRequest('/users/options/').then(data => { if (active) setOptions(data) })
      .catch(error => { if (active) setError(errorMessage(error)) })
    return () => { active = false }
  }, [])
  const change = event => setForm(previous => ({ ...previous, [event.target.name]: event.target.value }))
  const input = (name, label, { type = 'text', required = false } = {}) => <label className="user-editor-field">
    <span>{label}{required && <b> *</b>}</span>
    <input name={name} type={type} value={form[name]} onChange={change} required={required} autoComplete={name === 'password' ? 'new-password' : 'off'} />
  </label>
  const select = (name, label, choices) => <label className="user-editor-field">
    <span>{label}<b> *</b></span>
    <select name={name} value={form[name]} onChange={change} required>
      <option value="">Select {label.toLowerCase()}</option>
      {choices.map(([value, title]) => <option key={value} value={value}>{title}</option>)}
    </select>
  </label>
  const save = async event => {
    event.preventDefault()
    setSaving(true); setError('')
    const body = { ...form }
    if (!body.password) delete body.password
    if (!editing && projectId) body.default_projects = [projectId]
    try {
      await apiRequest(editing ? `/users/${initial.id}/` : '/users/', { method: editing ? 'PATCH' : 'POST', body })
      onSaved()
    } catch (error) { setError(errorMessage(error)) }
    finally { setSaving(false) }
  }
  return <div className="user-editor-overlay" onClick={() => { if (!saving) onClose() }}>
    <section className="user-editor" role="dialog" aria-modal="true" aria-labelledby="user-editor-title" onClick={event => event.stopPropagation()}>
      <header><div><h2 id="user-editor-title">{editing ? 'Edit User' : 'Create User'}</h2><p>Manage personal information, employment details, and account access.</p></div>
        <button type="button" onClick={onClose} disabled={saving} aria-label="Close user form">×</button></header>
      <form onSubmit={save}>
        {error && <p className="user-editor-error" role="alert">{error}</p>}
        <fieldset><legend>Personal Information</legend><div className="user-editor-grid">
          {input('first_name', 'First Name', { required: true })}{input('last_name', 'Last Name', { required: true })}
          {input('email', 'Company Email', { type: 'email', required: true })}{input('phone_number', 'Phone Number', { type: 'tel' })}
          {input('location', 'Location')}
        </div></fieldset>
        <fieldset><legend>Employment Details</legend><div className="user-editor-grid">
          {input('employee_id', 'Employee ID', { required: true })}{input('designation', 'Designation')}
          {select('department', 'Department', (options?.departments || []).map(name => [name, name]))}
          {select('employment_type', 'Employment Type', options?.employment_types || [])}
          {input('date_of_joining', 'Date of Joining', { type: 'date', required: true })}
        </div></fieldset>
        <fieldset><legend>Account & Access</legend><div className="user-editor-grid">
          {input('user_name', 'Username', { required: true })}
          {select('role_link', 'Role', (options?.roles || []).map(role => [role.id, role.name]))}
          {input('password', editing ? 'New Password (optional)' : 'Password', { type: 'password', required: !editing })}
          {select('account_status', 'Account Status', [['active', 'Active'], ['inactive', 'Inactive']])}
        </div><p>Use a tachyonautomations.com or tachyonadvancedsystems.com email address.</p></fieldset>
        <footer><button type="button" onClick={onClose} disabled={saving}>Cancel</button><button className="primary" disabled={saving || !options}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create User'}</button></footer>
      </form>
    </section>
  </div>
}
