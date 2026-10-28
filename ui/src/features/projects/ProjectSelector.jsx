import { useEffect, useRef, useState } from 'react'
import { useProjectSelection } from './useProjectSelection.js'
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
    <div ref={rootRef} className="relative!">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Select project"
        aria-expanded={isOpen}
        className="flex! items-center! gap-[6px]! h-[32px]! [background-color:var(--color-white)]! [border:1px_solid_var(--color-slate-200)]! rounded-[8px]! p-[0_12px]! text-[13px]! font-semibold! [color:var(--color-slate-900)]! cursor-pointer! [box-shadow:0_1px_2px_rgba(0,0,0,0.02)]! [font-family:inherit]! whitespace-nowrap!"
      >
        <span>{displayName}</span>
        <span className={"material-symbols-outlined" + " " + "text-[16px]! [color:var(--color-slate-500)]! [transition:transform_0.15s_ease]!"} style={{
  transform: isOpen ? "rotate(180deg)" : "none"
}}>expand_more</span>
      </button>

      {isOpen && <div className="absolute! top-[calc(100%_+_6px)]! left-[0]! min-w-[210px]! [background-color:var(--color-white)]! [border:1px_solid_var(--color-slate-200)]! rounded-[8px]! [box-shadow:0_10px_25px_-5px_rgba(0,0,0,0.1)]! z-[100]! overflow-y-auto! max-h-[260px]! p-[4px_0]!">
        {!availableProjects.length ? <div className="p-[10px_14px]! text-[13px]! [color:var(--color-slate-400)]!">No projects available</div> : availableProjects.map((project) => {
          const id = project?.Id ?? project?.id ?? "";
          const name = project?.Project_Name ?? project?.project_name ?? project?.name ?? String(project);
          const isSelected = String(id) === String(selection.id) || name === selection.name;
          return <button key={id || name} type="button" onClick={() => {
            const next = { id: String(id), name: String(name) };
            setSelectedProjectId(next.id);
            if (storageKey) localStorage.setItem(storageKey, next.id);
            onProjectSelect?.(next);
            setIsOpen(false);
          }} className="w-full! border-0! p-[9px_14px]! text-[13px]! cursor-pointer! flex! items-center! justify-between! text-left!" style={{
  fontWeight: isSelected ? 600 : 500,
  color: isSelected ? "var(--color-primary)" : "var(--color-slate-700)",
  backgroundColor: isSelected ? "var(--color-primary-subtle)" : "transparent"
}}>
            <span>{name}</span>
            {isSelected && <span className={"material-symbols-outlined" + " " + "text-[16px]! [color:var(--color-primary)]!"} >check</span>}
          </button>;
        })}
      </div>}
    </div>
  );
}
