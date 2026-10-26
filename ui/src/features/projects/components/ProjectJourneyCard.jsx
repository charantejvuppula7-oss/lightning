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

const ACTION_BTN_STYLE = {
  backgroundColor: "#ffffff",
  border: "1px solid #E2E8F0",
  borderRadius: "6px",
  padding: "6px 14px",
  fontSize: "13px",
  fontWeight: "600",
  color: "#2D3748",
  cursor: "pointer",
  transition: "all 0.15s ease",
  whiteSpace: "nowrap",
  fontFamily: "inherit",
  lineHeight: "1.4",
  display: "inline-flex",
  alignItems: "center",
  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
};

const MORE_DROPDOWN_ITEM_STYLE = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  width: "100%",
  background: "none",
  border: "none",
  padding: "8px 12px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: "500",
  color: "#334155",
  cursor: "pointer",
  textAlign: "left",
  transition: "background-color 0.15s ease",
  fontFamily: "inherit",
};


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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#172033", lineHeight: 1.3 }}>{projectName}</div>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 5, fontSize: 9, color: "#64748B" }}>
            {projectCode && <span style={{ background: "#F1F5F9", borderRadius: 3, padding: "2px 5px", letterSpacing: ".03em" }}>{projectCode}</span>}
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: projectStatus.color, background: projectStatus.bg, borderRadius: 10, padding: "2px 7px" }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: projectStatus.color }} />{projectStatus.label}</span>
            {customer && <span>{typeof customer === "object" ? customer.name || customer.Customer_Name : customer}</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          {canAddFeature && <button type="button" onClick={onAddFeature} style={{ ...ACTION_BTN_STYLE, padding: "5px 9px", fontSize: 10 }}>Add Feature</button>}
          {canAddMilestone && <button type="button" onClick={onAddMilestone} style={{ ...ACTION_BTN_STYLE, padding: "5px 9px", fontSize: 10 }}>Add Milestone</button>}
          {canAssignTask && <button type="button" onClick={onAssignTask} style={{ ...ACTION_BTN_STYLE, padding: "5px 9px", fontSize: 10 }}>Assign Task</button>}
          {onEditProject && <button type="button" onClick={onEditProject} style={{ ...ACTION_BTN_STYLE, padding: "5px 9px", fontSize: 10 }}>Edit project</button>}
          {hasMenuActions && <div style={{ position: "relative" }}>
            <button type="button" aria-label="More project actions" onClick={() => setMenuOpen(v => !v)} style={{ ...ACTION_BTN_STYLE, width: 26, height: 26, padding: 0, justifyContent: "center" }}><span className="material-symbols-outlined" style={{ fontSize: 15 }}>more_vert</span></button>
            {menuOpen && <div style={{ position: "absolute", right: 0, top: 30, zIndex: 10, minWidth: 145, padding: 5, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 6, boxShadow: "0 5px 16px #0F172A1A" }}>
              {onExportProject && <button type="button" onClick={() => { setMenuOpen(false); onExportProject(); }} style={MORE_DROPDOWN_ITEM_STYLE}>Export project</button>}
              {onPauseResume && <button type="button" onClick={() => { setMenuOpen(false); onPauseResume(isProjectPaused); }} style={MORE_DROPDOWN_ITEM_STYLE}>{isProjectPaused ? "Resume project" : "Pause project"}</button>}
              {onDeleteProject && <button type="button" onClick={() => { setMenuOpen(false); onDeleteProject(); }} style={{ ...MORE_DROPDOWN_ITEM_STYLE, color: "#DC2626" }}>Delete project</button>}
            </div>}
          </div>}
        </div>
      </div>

      <div style={{ borderTop: "1px solid #E5E7EB", margin: "11px 0 12px" }} />
      <div style={{ fontSize: 11, fontWeight: 700, color: "#202938", marginBottom: 19 }}>Project journey</div>

      <ProjectMilestoneTimeline project={project} />
    </div>
  );
}
