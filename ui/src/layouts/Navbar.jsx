import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useProjectSelection } from '../app/hooks/index.js'
import { NotificationBell } from '../features/notifications/NotificationBell.jsx'
import { getSession } from '../features/auth/api/authApi.js'

/* styling */
const tailwindStyling = {
  "material-symbols-outlined": [
    "[font-family:'Material_Symbols_Outlined']",
    "[font-weight:normal]",
    "[font-style:normal]",
    "[font-size:20px]",
    "[line-height:1]",
    "[letter-spacing:normal]",
    "[text-transform:none]",
    "[white-space:nowrap]",
    "[word-wrap:normal]",
    "[direction:ltr]",
    "[font-feature-settings:'liga']",
    "[-webkit-font-smoothing:antialiased]",
    "[&.sidebar-icon]:[font-size:20px]"
  ],
  "topbar": [
    "[height:50px]",
    "[min-height:50px]",
    "[position:sticky]",
    "[top:0]",
    "[z-index:40]",
    "[box-sizing:border-box]",
    "[border-bottom:1px_solid_var(--color-slate-200)]",
    "[display:flex]",
    "[align-items:center]",
    "[justify-content:space-between]",
    "[gap:12px]",
    "[padding:0_24px]",
    "[background:var(--color-white)]",
    "[&_button:focus-visible]:[outline:2px_solid_var(--color-primary)]",
    "[&_button:focus-visible]:[outline-offset:2px]",
    "max-[900px]:[padding:0_14px]",
    "max-[600px]:[height:auto]",
    "max-[600px]:[min-height:50px]",
    "max-[600px]:[flex-wrap:wrap]",
    "max-[600px]:[padding:8px_12px]"
  ],
  "project-select": [
    "[min-width:136px]",
    "[height:32px]",
    "[border:1px_solid_var(--color-slate-200)]",
    "[border-radius:8px]",
    "[background:var(--color-white)]",
    "[padding:0_12px]",
    "[display:flex]",
    "[align-items:center]",
    "[gap:6px]",
    "[justify-content:space-between]",
    "[font:inherit]",
    "[font-size:13px]",
    "[font-weight:600]",
    "[color:var(--color-slate-900)]",
    "[&_.material-symbols-outlined]:[font-size:16px]",
    "[&_.material-symbols-outlined]:[color:var(--color-slate-500)]",
    "max-[600px]:[min-width:105px]"
  ],
  "project-switcher": [
    "[position:relative]",
    "[&_summary]:[cursor:pointer]",
    "[&_summary]:[list-style:none]",
    "[&_summary::-webkit-details-marker]:[display:none]"
  ],
  "project-select-label": [
    "[max-width:180px]",
    "[overflow:hidden]",
    "[text-overflow:ellipsis]",
    "[white-space:nowrap]"
  ],
  "project-switcher-menu": [
    "[position:absolute]",
    "[top:calc(100%_+_6px)]",
    "[left:0]",
    "[min-width:220px]",
    "[max-height:320px]",
    "[overflow-y:auto]",
    "[padding:5px]",
    "[background:var(--color-white)]",
    "[border:1px_solid_var(--color-slate-200)]",
    "[border-radius:8px]",
    "[box-shadow:0_8px_20px_#17203320]",
    "[z-index:50]",
    "[&_button]:[width:100%]",
    "[&_button]:[border:0]",
    "[&_button]:[border-radius:5px]",
    "[&_button]:[background:transparent]",
    "[&_button]:[padding:8px_10px]",
    "[&_button]:[text-align:left]",
    "[&_button]:[font:inherit]",
    "[&_button]:[font-size:13px]",
    "[&_button]:[cursor:pointer]",
    "[&_button:hover]:[background:var(--color-primary-subtle)]",
    "[&_button:hover]:[color:var(--color-primary)]",
    "[&_button[aria-current=\"true\"]]:[background:var(--color-primary-subtle)]",
    "[&_button[aria-current=\"true\"]]:[color:var(--color-primary)]"
  ],
  "project-switcher-status": [
    "[display:block]",
    "[padding:8px_10px]",
    "[color:var(--color-slate-500)]",
    "[font-size:12px]"
  ],
  "topbar-actions": [
    "[display:flex]",
    "[align-items:center]",
    "[gap:12px]",
    "[min-width:0]",
    "max-[600px]:[flex:1_1_100%]",
    "max-[600px]:[gap:10px]"
  ],
  "search-box": [
    "[width:260px]",
    "[height:36px]",
    "[display:flex]",
    "[align-items:center]",
    "[gap:12px]",
    "[border:1px_solid_var(--color-slate-200)]",
    "[border-radius:6px]",
    "[padding:0_12px]",
    "[color:var(--color-slate-400)]",
    "[box-shadow:0_1px_4px_#1720330d]",
    "[&_input]:[min-width:0]",
    "[&_input]:[width:100%]",
    "[&_input]:[border:0]",
    "[&_input]:[outline:0]",
    "[&_input]:[font:inherit]",
    "[&_input]:[color:var(--color-slate-600)]",
    "[&_input]:[font-size:15px]",
    "[&_input]:[background:transparent]",
    "[&_.material-symbols-outlined]:[font-size:20px]",
    "[&_.material-symbols-outlined]:[flex:0_0_20px]",
    "[&:focus-within]:[outline:2px_solid_var(--color-primary)]",
    "[&:focus-within]:[outline-offset:2px]",
    "max-[900px]:[width:min(260px,_35vw)]",
    "max-[600px]:[flex:1]",
    "max-[600px]:[width:auto]",
    "max-[600px]:[min-width:0]",
    "max-[600px]:[padding-inline:9px]"
  ],
  "avatar": [
    "[width:32px]",
    "[height:32px]",
    "[flex:0_0_32px]",
    "[border-radius:50%]",
    "[display:grid]",
    "[place-items:center]",
    "[background:#f97316]",
    "[color:white]",
    "[font-size:12px]",
    "[font-weight:700]"
  ]
}
const styling = value => {
  const classes = typeof value === 'string' ? value : ''
  const utilities = classes.split(/\s+/).flatMap(name => tailwindStyling[name] || [])
  return [...new Set([...classes.split(/\s+/), ...utilities])].filter(Boolean).join(' ')
}



export default function Navbar({ user, searchQuery, onSearchChange }) {
  const { projects, selectedProjectId, setSelectedProjectId, loading, error, loadProjects } = useProjectSelection()
  const dropdown = useRef(null)
  const [sessionUser, setSessionUser] = useState(null)
  useEffect(() => { loadProjects() }, [loadProjects])
  useEffect(() => {
    if (user) return
    let active = true
    getSession().then((data) => {
      if (active) setSessionUser(data.user)
    }).catch(() => {})
    return () => { active = false }
  }, [user])
  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (dropdown.current && !dropdown.current.contains(event.target)) dropdown.current.open = false
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [])
  const selectedProject = projects.find((project) => project.id === selectedProjectId)
  const currentUser = user || sessionUser
  const initials = `${currentUser?.first_name?.trim()[0] || ''}${currentUser?.last_name?.trim()[0] || ''}`.toUpperCase() || '?'

  const selectProject = (id) => {
    setSelectedProjectId(id)
    dropdown.current.open = false
  }

  return <header className={styling("topbar")}>
    <details className={styling("project-switcher")} ref={dropdown}>
      <summary className={styling("project-select")} aria-label="Select project">
        <span className={styling("project-select-label")}>{selectedProject?.project_name || 'All Projects'}</span>
        <span className={styling("material-symbols-outlined")} aria-hidden="true">expand_more</span>
      </summary>
      <div className={styling("project-switcher-menu")}>
        {loading && <span className={styling("project-switcher-status")}>Loading projects…</span>}
        {error && <button type="button" onClick={loadProjects}>Retry loading projects</button>}
        {!error && <>
          <button type="button" aria-current={selectedProjectId === 'all' ? 'true' : undefined} onClick={() => selectProject('all')}>All Projects</button>
          {projects.map((project) => <button
            type="button"
            key={project.id}
            aria-current={selectedProjectId === project.id ? 'true' : undefined}
            onClick={() => selectProject(project.id)}
          >{project.project_name}</button>)}
          {!loading && projects.length === 0 && <span className={styling("project-switcher-status")}>No assigned projects</span>}
        </>}
      </div>
    </details>
    <div className={styling("topbar-actions")}>
      <label className={styling("search-box")}>
        <span className={styling("material-symbols-outlined")} aria-hidden="true">search</span>
        <input aria-label="Search" placeholder="Search tasks, docs, people...." value={searchQuery} onChange={onSearchChange} />
      </label>
      <NotificationBell />
      <Link to="/profile" className={styling("avatar")} title="My Profile" style={{ textDecoration: 'none' }}>{initials}</Link>
    </div>
  </header>
}
