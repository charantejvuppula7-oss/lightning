import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useProjectSelection } from '../../app/hooks/index.js'

/* styling */
const tailwindStyling = {
  "page-content": [
    "[padding:28px]",
    "max-[600px]:[padding:16px]"
  ],
  "page-heading": [
    "[background:white]",
    "[border:1px_solid_#e5e6eb]",
    "[border-radius:12px]",
    "[padding:19px_22px_0]",
    "[margin-bottom:20px]",
    "[&_h1]:[margin:0]",
    "[&_h1]:[font-size:28px]",
    "[&_h1]:[line-height:1.25]",
    "[&_h1]:[letter-spacing:-.4px]",
    "[&_h1]:[color:#172033]",
    "[&_p]:[margin:4px_0_0]",
    "[&_p]:[font-size:14px]",
    "[&_p]:[color:#737986]"
  ],
  "project-card": [
    "[background:#fff]",
    "[border:1px_solid_#e2e8f0]",
    "[border-radius:16px]",
    "[box-shadow:0_2px_8px_#00000005]",
    "[padding:28px]",
    "[min-width:0]",
    "[&_>_.project-grid]:[margin-bottom:20px]",
    "[&_>_.project-field]:[margin-bottom:20px]",
    "max-[700px]:[padding:18px]"
  ],
  "project-alert": [
    "[padding:12px_16px]",
    "[margin-bottom:18px]",
    "[border:1px_solid_#c8daf9]",
    "[border-radius:8px]",
    "[background:#eef5ff]",
    "[color:#264c91]",
    "[font-size:13px]",
    "[overflow-wrap:anywhere]"
  ],
  "project-primary": [
    "[display:inline-flex]",
    "[align-items:center]",
    "[justify-content:center]",
    "[min-height:42px]",
    "[box-sizing:border-box]",
    "[border-radius:9px]",
    "[padding:10px_20px]",
    "[font:inherit]",
    "[font-size:14px]",
    "[font-weight:650]",
    "[text-decoration:none]",
    "[cursor:pointer]",
    "[border:1px_solid_#3b82f6]",
    "[color:#fff]",
    "[background:#3b82f6]",
    "[&:hover]:[background:#246bd9]",
    "[&:disabled]:[opacity:.55]",
    "[&:disabled]:[cursor:wait]"
  ],
  "project-list-grid": [
    "[display:grid]",
    "[grid-template-columns:repeat(auto-fill,minmax(245px,1fr))]",
    "[gap:16px]",
    "[&_.project-card_h2]:[font-size:17px]",
    "[&_.project-card_h2]:[margin:0_0_15px]",
    "[&_.project-card_a]:[color:#2169d4]",
    "[&_.project-card_a]:[font-size:13px]",
    "[&_.project-card_a]:[font-weight:700]"
  ]
}
const styling = value => {
  const classes = typeof value === 'string' ? value : ''
  const utilities = classes.split(/\s+/).flatMap(name => tailwindStyling[name] || [])
  return [...new Set([...classes.split(/\s+/), ...utilities])].filter(Boolean).join(' ')
}



export default function ProjectsPage({ user }) {
  const { projects, loading, error, loadProjects } = useProjectSelection()
  const { state } = useLocation()
  useEffect(() => { loadProjects() }, [loadProjects])
  return <div className={styling("page-content")}>
    <div className={styling("page-heading")} style={{ paddingBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
      <div><h1>Projects</h1><p>Projects assigned to you</p></div>
      {user?.permissions?.Projects?.Create === true && <Link className={styling("project-primary")} to="/projects/new">Create Project</Link>}
    </div>
    {state?.saved && <p role="status" className={styling("project-alert")}>{state.saved}</p>}
    {loading && <p>Loading projects…</p>}
    {error && <button type="button" onClick={loadProjects}>Retry loading projects</button>}
    {!loading && !error && !projects.length && <section className={styling("project-card")}><p>No assigned projects yet.</p></section>}
    {!loading && !error && <div className={styling("project-list-grid")}>{projects.map(project =>
      <article className={styling("project-card")} key={project.id}>
        <h2>{project.project_name}</h2>
        {user?.permissions?.Projects?.Edit === true && <Link to={`/projects/${project.id}/edit`}>Edit project</Link>}
      </article>)}</div>}
  </div>
}
