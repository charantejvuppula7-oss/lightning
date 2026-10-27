import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useProjectSelection } from './useProjectSelection.js'

export default function ProjectsPage({ user }) {
  const { projects, loading, error, loadProjects } = useProjectSelection()
  const { state } = useLocation()
  useEffect(() => { loadProjects() }, [loadProjects])
  return <div className="page-content">
    <div className={"page-heading" + " " + "pb-[18px]! flex! justify-between! items-center! gap-[16px]!"} >
      <div><h1>Projects</h1><p>Projects assigned to you</p></div>
      {user?.permissions?.Projects?.Create === true && <Link className="project-primary" to="/projects/new">Create Project</Link>}
    </div>
    {state?.saved && <p role="status" className="project-alert">{state.saved}</p>}
    {loading && <p>Loading projects…</p>}
    {error && <button type="button" onClick={loadProjects}>Retry loading projects</button>}
    {!loading && !error && !projects.length && <section className="project-card"><p>No assigned projects yet.</p></section>}
    {!loading && !error && <div className="project-list-grid">{projects.map(project =>
      <article className="project-card" key={project.id}>
        <h2>{project.project_name}</h2>
        {user?.permissions?.Projects?.Edit === true && <Link to={`/projects/${project.id}/edit`}>Edit project</Link>}
      </article>)}</div>}
  </div>
}
