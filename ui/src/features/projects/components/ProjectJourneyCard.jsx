import { useState } from "react";
import ProjectMilestoneTimeline from "./ProjectMilestoneTimeline.jsx";

const STATUS_MAP = {
  ongoing: { label: "On going", bg: "var(--color-primary-border)", color: "var(--color-primary-hover)" },
  active: { label: "On going", bg: "var(--color-primary-border)", color: "var(--color-primary-hover)" },
  on_track: { label: "On going", bg: "var(--color-primary-border)", color: "var(--color-primary-hover)" },
  paused: { label: "Paused", bg: "var(--color-warning-bg)", color: "#B45309" },
  upcoming: { label: "Upcoming", bg: "#FEF9C3", color: "#854D0E" },
  delayed: { label: "Delayed", bg: "var(--color-danger-border)", color: "#991B1B" },
  completed: { label: "Completed", bg: "#D1FAE5", color: "#065F46" },
  critical: { label: "Critical", bg: "var(--color-danger-border)", color: "#991B1B" },
};

function getProjectStatus(project) {
  const raw = (project?.Status || project?.status || "active").toLowerCase().replace(/\s+/g, "_");
  return STATUS_MAP[raw] || { label: "Active", bg: "var(--color-primary-border)", color: "var(--color-primary-hover)" };
}

export default function ProjectJourneyCard({
  project = null,
  onAddFeature,
  onAddMilestone,
  onAssignTask,
  onEditProject,
  onExportProject,
  onPauseResume,
  onDeleteProject,
  isProjectPaused = false,
  showCard = true,
  style = {},
  className = "",
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const projectName = project?.Project_Name || project?.project_name || project?.Name || project?.name || "Project";
  const projectCode = project?.Project_Code || project?.project_code || project?.Code || project?.code || "";
  const projectStatus = getProjectStatus(project);
  const customer = project?.Customer_Name || project?.customer_name || project?.Customer || project?.customer || "";
  const canAddFeature = onAddFeature;
  const canAddMilestone = onAddMilestone;
  const canAssignTask = onAssignTask;
  const hasMenuActions = Boolean(onExportProject || onPauseResume || onDeleteProject);
  const cardStyle = showCard ? {
    background: "#fff", border: "1px solid #E1E4E8", borderRadius: 8,
    padding: "14px 16px", ...style,
  } : style;

  return (
    <div className={className} style={{ width: "100%", boxSizing: "border-box", fontFamily: "Inter, system-ui, sans-serif", ...cardStyle }}>
      <div className="flex! justify-between! items-start! gap-[12px]!">
        <div className="min-w-0!">
          <div className="text-[14px]! font-bold! [color:#172033]! leading-[1.3]!">{projectName}</div>
          <div className="flex! items-center! flex-wrap! gap-[8px]! mt-[5px]! text-[9px]! [color:#64748B]!">
            {projectCode && <span className="[background:#F1F5F9]! rounded-[3px]! p-[2px_5px]! tracking-[.03em]!">{projectCode}</span>}
            <span className="inline-flex! items-center! gap-[4px]! rounded-[10px]! p-[2px_7px]!" style={{
  color: projectStatus.color,
  background: projectStatus.bg
}}><span className="w-[5px]! h-[5px]! rounded-[50%]!" style={{
  background: projectStatus.color
}} />{projectStatus.label}</span>
            {customer && <span>{typeof customer === "object" ? customer.name || customer.Customer_Name : customer}</span>}
          </div>
        </div>
        <div className="flex! items-center! gap-[5px]! shrink-0!">
          {canAddFeature && <button type="button" onClick={onAddFeature} className="[background-color:#ffffff]! [border:1px_solid_#E2E8F0]! rounded-[6px]! p-[5px_9px]! text-[10px]! font-semibold! [color:#2D3748]! cursor-pointer! [transition:all_0.15s_ease]! whitespace-nowrap! [font-family:inherit]! leading-[1.4]! inline-flex! items-center! [box-shadow:0_1px_2px_rgba(0,0,0,0.03)]!">Add Feature</button>}
          {canAddMilestone && <button type="button" onClick={onAddMilestone} className="[background-color:#ffffff]! [border:1px_solid_#E2E8F0]! rounded-[6px]! p-[5px_9px]! text-[10px]! font-semibold! [color:#2D3748]! cursor-pointer! [transition:all_0.15s_ease]! whitespace-nowrap! [font-family:inherit]! leading-[1.4]! inline-flex! items-center! [box-shadow:0_1px_2px_rgba(0,0,0,0.03)]!">Add Milestone</button>}
          {canAssignTask && <button type="button" onClick={onAssignTask} className="[background-color:#ffffff]! [border:1px_solid_#E2E8F0]! rounded-[6px]! p-[5px_9px]! text-[10px]! font-semibold! [color:#2D3748]! cursor-pointer! [transition:all_0.15s_ease]! whitespace-nowrap! [font-family:inherit]! leading-[1.4]! inline-flex! items-center! [box-shadow:0_1px_2px_rgba(0,0,0,0.03)]!">Assign Task</button>}
          {onEditProject && <button type="button" onClick={onEditProject} className="[background-color:#ffffff]! [border:1px_solid_#E2E8F0]! rounded-[6px]! p-[5px_9px]! text-[10px]! font-semibold! [color:#2D3748]! cursor-pointer! [transition:all_0.15s_ease]! whitespace-nowrap! [font-family:inherit]! leading-[1.4]! inline-flex! items-center! [box-shadow:0_1px_2px_rgba(0,0,0,0.03)]!">Edit project</button>}
          {hasMenuActions && <div className="relative!">
            <button type="button" aria-label="More project actions" onClick={() => setMenuOpen(v => !v)} className="[background-color:#ffffff]! [border:1px_solid_#E2E8F0]! rounded-[6px]! p-0! text-[13px]! font-semibold! [color:#2D3748]! cursor-pointer! [transition:all_0.15s_ease]! whitespace-nowrap! [font-family:inherit]! leading-[1.4]! inline-flex! items-center! [box-shadow:0_1px_2px_rgba(0,0,0,0.03)]! w-[26px]! h-[26px]! justify-center!"><span className={"material-symbols-outlined" + " " + "text-[15px]!"} >more_vert</span></button>
            {menuOpen && <div className="absolute! right-[0]! top-[30px]! z-[10]! min-w-[145px]! p-[5px]! [background:#fff]! [border:1px_solid_#E2E8F0]! rounded-[6px]! [box-shadow:0_5px_16px_#0F172A1A]!">
              {onExportProject && <button type="button" onClick={() => { setMenuOpen(false); onExportProject(); }} className="flex! items-center! gap-[8px]! w-full! [background:none]! border-0! p-[8px_12px]! rounded-[6px]! text-[12px]! font-medium! [color:#334155]! cursor-pointer! text-left! [transition:background-color_0.15s_ease]! [font-family:inherit]!">Export project</button>}
              {onPauseResume && <button type="button" onClick={() => { setMenuOpen(false); onPauseResume(isProjectPaused); }} className="flex! items-center! gap-[8px]! w-full! [background:none]! border-0! p-[8px_12px]! rounded-[6px]! text-[12px]! font-medium! [color:#334155]! cursor-pointer! text-left! [transition:background-color_0.15s_ease]! [font-family:inherit]!">{isProjectPaused ? "Resume project" : "Pause project"}</button>}
              {onDeleteProject && <button type="button" onClick={() => { setMenuOpen(false); onDeleteProject(); }} className="flex! items-center! gap-[8px]! w-full! [background:none]! border-0! p-[8px_12px]! rounded-[6px]! text-[12px]! font-medium! [color:#DC2626]! cursor-pointer! text-left! [transition:background-color_0.15s_ease]! [font-family:inherit]!">Delete project</button>}
            </div>}
          </div>}
        </div>
      </div>

      <div className="[border-top:1px_solid_#E5E7EB]! m-[11px_0_12px]!" />
      <div className="text-[11px]! font-bold! [color:#202938]! mb-[19px]!">Project journey</div>

      <ProjectMilestoneTimeline project={project} />
    </div>
  );
}
