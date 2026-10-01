import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useProjectSelection } from '../features/projects/projectSelectionContext.js'
import { NotificationBell } from '../features/notifications/NotificationBell.jsx'
import { getSession } from '../features/auth/api/authApi.js'

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

  return <header className="topbar">
    <details className="project-switcher" ref={dropdown}>
      <summary className="project-select" aria-label="Select project">
        <span className="project-select-label">{selectedProject?.project_name || 'All Projects'}</span>
        <span className="material-symbols-outlined" aria-hidden="true">expand_more</span>
      </summary>
      <div className="project-switcher-menu">
        {loading && <span className="project-switcher-status">Loading projects…</span>}
        {error && <button type="button" onClick={loadProjects}>Retry loading projects</button>}
        {!error && <>
          <button type="button" aria-current={selectedProjectId === 'all' ? 'true' : undefined} onClick={() => selectProject('all')}>All Projects</button>
          {projects.map((project) => <button
            type="button"
            key={project.id}
            aria-current={selectedProjectId === project.id ? 'true' : undefined}
            onClick={() => selectProject(project.id)}
          >{project.project_name}</button>)}
          {!loading && projects.length === 0 && <span className="project-switcher-status">No assigned projects</span>}
        </>}
      </div>
    </details>
    <div className="topbar-actions">
      <label className="search-box">
        <span className="material-symbols-outlined" aria-hidden="true">search</span>
        <input aria-label="Search" placeholder="Search tasks, docs, people...." value={searchQuery} onChange={onSearchChange} />
      </label>
      <NotificationBell />
      <Link to="/profile" className="avatar" title="My Profile" style={{ textDecoration: 'none' }}>{initials}</Link>
    </div>
  </header>
}
