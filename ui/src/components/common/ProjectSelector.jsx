import { useEffect, useRef, useState } from 'react'
import { useProjectSelection } from '../../app/hooks/useProjectSelection.js'
export default function ProjectSelector({ onProjectSelect, user }) {
 const { projects: availableProjects, selectedProjectId, setSelectedProjectId, loadProjects } = useProjectSelection()
 const rootRef = useRef(null)
 const [isOpen, setIsOpen] = useState(false)
 const storageKey = user?.id ? `company-project-selection-${user.id}` : null
 useEffect(() => {
   if (!storageKey || !availableProjects.length) return
   const saved = localStorage.getItem(storageKey)
   const selected = availableProjects.find(project => String(project.id) === saved) || availableProjects[0]
   setSelectedProjectId(selected.id)
 }, [storageKey, availableProjects, setSelectedProjectId])
 useEffect(() => { loadProjects() }, [loadProjects])
 useEffect(() => {
   const close = event => { if (!rootRef.current?.contains(event.target)) setIsOpen(false) }
   document.addEventListener('mousedown', close)
   return () => document.removeEventListener('mousedown', close)
 }, [])
 const chosen = availableProjects.find(project => project.id === selectedProjectId)
 const selection = { id: selectedProjectId, name: chosen?.project_name || '' }
 const displayName = chosen?.project_name || (availableProjects.length ? 'Select Project' : 'No Projects')
  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Select project"
        aria-expanded={isOpen}
        style={{ display: "flex", alignItems: "center", gap: "6px", height: "32px", backgroundColor: "var(--color-white)", border: "1px solid var(--color-slate-200)", borderRadius: "8px", padding: "0 12px", fontSize: "13px", fontWeight: "600", color: "var(--color-slate-900)", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.02)", fontFamily: "inherit", whiteSpace: "nowrap" }}
      >
        <span>{displayName}</span>
        <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "var(--color-slate-500)", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}>expand_more</span>
      </button>

      {isOpen && <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, minWidth: "210px", backgroundColor: "var(--color-white)", border: "1px solid var(--color-slate-200)", borderRadius: "8px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)", zIndex: 100, overflowY: "auto", maxHeight: "260px", padding: "4px 0" }}>
        {!availableProjects.length ? <div style={{ padding: "10px 14px", fontSize: "13px", color: "var(--color-slate-400)" }}>No projects available</div> : availableProjects.map((project) => {
          const id = project?.Id ?? project?.id ?? "";
          const name = project?.Project_Name ?? project?.project_name ?? project?.name ?? String(project);
          const isSelected = String(id) === String(selection.id) || name === selection.name;
          return <button key={id || name} type="button" onClick={() => {
            const next = { id: String(id), name: String(name) };
            setSelectedProjectId(next.id);
            if (storageKey) localStorage.setItem(storageKey, next.id);
            onProjectSelect?.(next);
            setIsOpen(false);
          }} style={{ width: "100%", border: 0, padding: "9px 14px", fontSize: "13px", fontWeight: isSelected ? 600 : 500, color: isSelected ? "var(--color-primary)" : "var(--color-slate-700)", backgroundColor: isSelected ? "var(--color-primary-subtle)" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", textAlign: "left" }}>
            <span>{name}</span>
            {isSelected && <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "var(--color-primary)" }}>check</span>}
          </button>;
        })}
      </div>}
    </div>
  );
}
