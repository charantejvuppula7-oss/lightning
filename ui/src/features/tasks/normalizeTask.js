import { elapsedSeconds } from './taskTime.js'

export default function normalizeTask(raw) {
  if (!raw) return null;

  // Determine status
  const rawStatusLower = String(raw.Status || raw.status || "assigned").toLowerCase().replace(/-/g, "_");
  let status = rawStatusLower;
  const isChangeRequested = Boolean(raw.Change_Requested || raw.change_requested);
  if (isChangeRequested) {
    status = "change_requested";
  } else if (status === "paused") {
    status = "in_progress";
  } else if (status === "started" || status === "open") {
    status = "assigned";
  }

  // Parse Remarks / change request history
  let changeRequests = [];
  let isReopened = Boolean(raw.reopened || raw.is_reopened);
  let reopenCount = Number(raw.reopen_count || raw.Reopen_Count || 0);
  let resentForReview = Boolean(raw.resent_for_review || raw.Resent_For_Review);
  let points = 0;
  if (raw.Remarks) {
    try {
      const meta = typeof raw.Remarks === "string" ? JSON.parse(raw.Remarks) : raw.Remarks;
      if (meta && typeof meta === "object") {
        points = meta.points || 0;
        if (meta.change_requested) status = 'change_requested';
        if (meta.reopened || meta.is_reopened) {
          isReopened = true;
        }
        if (meta.reopened === false || meta.is_reopened === false) {
          isReopened = false;
        }
        if (meta.reopen_count !== undefined) {
          reopenCount = Number(meta.reopen_count) || 0;
        }
        if (meta.resent_for_review !== undefined) {
          resentForReview = Boolean(meta.resent_for_review);
        }
        if (Array.isArray(meta.change_requests) && meta.change_requests.length > 0) {
          changeRequests = meta.change_requests;
        } else if (meta.change_reason || isChangeRequested) {
          changeRequests = [
            {
              title: "Change requested",
              date: raw.Updated_At
                ? new Date(raw.Updated_At).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : "Recent",
              changes: [meta.change_reason || "Revisions requested for this task."],
              attachments: meta.attachments || [],
            },
          ];
        }
      }
    } catch {
      // ignore JSON parse errors
    }
  }

  // Assignee(s)
  const assignedToName = raw.Assigned_To_Name || raw.assigned_to_name || "Unassigned";
  const assignedToInitials = assignedToName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "UA";

  const assignedTo = [
    {
      id: raw.Assigned_To || raw.assigned_to || null,
      name: assignedToName,
      role: raw.Assigned_To_Role || "Developer",
      initials: assignedToInitials,
      color: "#5F89C5",
    },
  ];

  // Reviewer
  const reviewerId = raw.review_by || raw.Review_By || raw.reviewer_id || null;
  const reviewerName = raw.review_by_name || raw.Review_By_Name || (reviewerId ? "Reviewer" : "Unassigned");
  const reviewerInitials = reviewerName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "YM";

  const reviewer = {
    id: reviewerId ? String(reviewerId) : null,
    name: reviewerName,
    role: "Reviewer",
    initials: reviewerInitials,
    color: "#C5A45F",
  };

  // Assigned by
  const assignedBy = {
    id: raw.Assigned_By || raw.assigned_by_id || raw.project_created_by || null,
    name: raw.Assigned_By_Name || raw.assigned_by_name || raw.created_by_name || "Project Manager",
    role: "Assigned by",
    initials: "PM",
    color: "#82B58B",
  };

  // Display ID e.g. T014 or first 5 chars
  let displayId = "T001";
  if (raw.Task_Name && raw.Task_Name.startsWith("SP-")) {
    const prefix = raw.Task_Name.split(":")[0].trim();
    displayId = prefix;
  } else if (raw.Id) {
    displayId = "T" + String(raw.Id).replace(/-/g, "").slice(0, 4).toUpperCase();
  }

  // Format Due Date
  let formattedDue = raw.Due_Date || "No due date";
  if (raw.Due_Date) {
    try {
      const d = new Date(raw.Due_Date);
      if (!isNaN(d.getTime())) {
        formattedDue = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }
    } catch { /* Keep the original due date when formatting fails. */ }
  }

  // Timer status & seconds
  let timerStatus = "default";
  if (status === "in_progress") {
    timerStatus = (rawStatusLower === "paused" || raw.pause_Time) ? "paused" : "running";
  } else if (status === "completed") {
    timerStatus = "completed";
  }

  const timerSeconds = elapsedSeconds(raw);

  const normPriority = String(raw.Priority || raw.priority || "medium").toLowerCase();

  return {
    raw,
    id: displayId,
    dbId: String(raw.Id || raw.id || ""),
    name: raw.Task_Name || "Untitled Task",
    status,
    priority: normPriority,
    description: raw.description || "No description provided for this task.",
    project: raw.Project_Name || raw.project_name || "General",
    // Only use milestone/feature if they have actual values from API (not default fallbacks)
    milestone: raw.Milestone_Name || raw.milestone_name || null,
    feature: raw.Feature_Name || raw.feature_name || null,
    sprint: (() => {
      if (raw.Sprint_Label) return raw.Sprint_Label;
      if (raw.Sprint_Number !== undefined && raw.Sprint_Number !== null) return `S${raw.Sprint_Number}`;
      const rawSprint = String(raw.sprint_name || "").trim();
      if (rawSprint) {
        const match = rawSprint.match(/\d+/);
        if (match) return `S${parseInt(match[0], 10)}`;
        return rawSprint.startsWith("S") ? rawSprint : `S${rawSprint}`;
      }
      const taskNameMatch = String(raw.Task_Name || "").match(/SP-(\d+)/i);
      if (taskNameMatch) return `S${parseInt(taskNameMatch[1], 10)}`;
      return "";
    })(),
    points,
    dueDate: formattedDue,
    timerStatus,
    timerSeconds,
    dependencyCount: raw.dependency_count ?? (Array.isArray(raw.dependencies) ? raw.dependencies.length : 0),
    assignedBy,
    assignedTo,
    reviewer,
    changeRequests,
    isReopened,
    reopenCount: Number.isFinite(reopenCount) ? Math.max(0, reopenCount) : 0,
    resentForReview,
  };
}
