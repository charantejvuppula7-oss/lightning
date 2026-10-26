import { elapsedSeconds } from './taskTime.js';
import { saveTask } from './saveTask.js';
import { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiList, errorMessage } from '../../services/api/apiClient.js';
import { useFeedback } from '../../components/common/Feedback.jsx';
import { ProjectSelectionContext } from '../projects/projectSelectionContext.js';
import { hasSidebarPermission } from '../../layouts/sidebarNavigation.js';
import { roleSlug } from '../../utils/roles.js';
import TaskCard from './components/TaskCard.jsx';
import EditTaskPage from './components/TaskEditor.jsx';
import FilterDropdown from './components/FilterDropdown.jsx';
import SortMenu from './components/SortMenu.jsx';
import { DEFAULT_SORT_OPTIONS } from './components/sortOptions.js';
function TaskList({
  tasks = [],
  onAddDependencyClick,
  onChat,
  onMenuClick,
  onTaskUpdate,
  onTaskDelete,
  canEditTask = false,
  canDeleteTask = false,
  currentUserId,
  currentUserNames = [],
  className = "",
  style = {},
  toast,
}) {
  const [taskParams] = useSearchParams();
  const [openTaskId, setOpenTaskId] = useState(() => taskParams.get('taskId'));

  const taskNumbers = new Map(
    [...tasks]
      .map((task, index) => ({
        task,
        index,
        createdAt: new Date(task.raw?.created_at || task.raw?.Created_At || NaN).getTime(),
      }))
      .sort((a, b) => {
        const timeA = Number.isFinite(a.createdAt) ? a.createdAt : Infinity;
        const timeB = Number.isFinite(b.createdAt) ? b.createdAt : Infinity;
        return (timeA - timeB) || (a.index - b.index);
      })
      .map(({ task }, index) => [
        task.dbId || task.Id || task.id,
        task.raw?.Task_Number ?? task.raw?.task_number ?? task.Task_Number ?? task.task_number ?? index + 1,
      ]),
  );

  const handleToggle = (taskId, isOpen) => {
    setOpenTaskId(isOpen ? taskId : null);
  };

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        ...style,
      }}
    >
      {tasks.map((task) => {
        const taskId = task.dbId || task.Id || task.id;
        return (
          <TaskCard
            toast={toast}
            canReviewTask={task.raw?.can_review === true}
            key={taskId}
            task={task}
            sequenceNumber={taskNumbers.get(taskId)}
            isOpen={openTaskId === taskId}
            onToggle={(_, isOpen) => handleToggle(taskId, isOpen)}
            onAddDependency={onAddDependencyClick}
            onChat={() => onChat?.(taskId)}
            onMenuClick={() => onMenuClick?.(taskId)}
            onTaskUpdate={onTaskUpdate}
            onTaskDelete={onTaskDelete}
            canEditTask={canEditTask}
            canDeleteTask={canDeleteTask}
            isAssignedUser={Boolean(task.assignedTo?.some((assignee) =>
              (currentUserId && assignee.id && String(assignee.id) === String(currentUserId)) ||
              currentUserNames.some((name) => String(name).toLowerCase() === String(assignee.name || "").toLowerCase())
            ))}
            isTaskAssigner={Boolean(
              currentUserId && task.assignedBy?.id && String(task.assignedBy.id) === String(currentUserId)
            )}
          />
        );
      })}
    </div>
  );
}

// ── Data Normalization Helper ────────────────────────────────────────
function normalizeTask(raw) {
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
  if (raw.Remarks) {
    try {
      const meta = typeof raw.Remarks === "string" ? JSON.parse(raw.Remarks) : raw.Remarks;
      if (meta && typeof meta === "object") {
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
    points: (() => { try { return JSON.parse(raw.Remarks || "{}").points || 0; } catch { return 0; } })(),
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

function isAssignedToUser(task, userId, userNames) {
  return Boolean(task?.assignedTo?.some((assignee) =>
    (userId && assignee.id && String(assignee.id) === String(userId)) ||
    userNames.some((name) => String(name).toLowerCase() === String(assignee.name || "").toLowerCase())
  ));
}

export default function TasksPage({ user: currentUser }) {
  const { projects, selectedProjectId: externalProjectId } = useContext(ProjectSelectionContext);
  const externalProject = projects.find(project => project.id === externalProjectId)?.project_name || '';
  const currentUserId = currentUser.id;
  const currentUserNames = useMemo(() => [currentUser.user_name], [currentUser.user_name]);
  const userRole = ['admin', 'pm'].includes(roleSlug(currentUser.role)) ? roleSlug(currentUser.role) : 'user';
  const admin = userRole === 'admin';
  const canEditTask = admin || hasSidebarPermission(currentUser.permissions, 'Tasks', 'Edit');
  const canDeleteTask = admin || hasSidebarPermission(currentUser.permissions, 'Tasks', 'Delete');
  const canCreateTask = Boolean(externalProjectId) && (admin || hasSidebarPermission(currentUser.permissions, 'Tasks', 'Create'));
  const isCurrentUserAssignee = task => isAssignedToUser(task, currentUserId, currentUserNames);
  const [searchParams, setSearchParams] = useSearchParams();
  const allowedTabs = ['all','my','in-progress','in-review','change-requested','completed'];
  const requestedTab = searchParams.get('tab');
  const activeTab = allowedTabs.includes(requestedTab) ? requestedTab : userRole === 'user' ? 'my' : 'all';
  const handleTabChange = tab => setSearchParams({ tab });
  const navigate = useNavigate();
  const { toast, feedback } = useFeedback();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchTasks = useCallback(async ({ signal } = {}) => {
    setLoading(true); setError(null);
    try { setTasks((await apiList(`/tasks/${externalProjectId && externalProjectId !== 'all' ? `?project=${externalProjectId}` : ''}`, { signal })).map(normalizeTask)); }
    catch (error) { if (!signal?.aborted) { setError(errorMessage(error)); setTasks([]); } }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [externalProjectId]);
  // Synchronize tasks with the selected project.
  useEffect(() => {
    const controller = new AbortController();
    // Starting an external request also updates its loading indicator.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTasks({ signal: controller.signal });
    return () => controller.abort();
  }, [fetchTasks]);
  const myTasks = tasks.filter(task => isAssignedToUser(task, currentUserId, currentUserNames));
  const counts = { all: tasks.length, my: myTasks.length,
    'in-progress': myTasks.filter(task => task.status === 'in_progress').length,
    'in-review': myTasks.filter(task => task.status === 'in_review').length,
    'change-requested': myTasks.filter(task => task.status === 'change_requested').length,
    completed: myTasks.filter(task => task.status === 'completed').length };
  const handleTaskUpdate = () => fetchTasks();
  const handleTaskDelete = () => fetchTasks();
  const handleAddDependency = task => navigate(`/${userRole}/dependencies?taskId=${task.id || task.Id}`, {state:{targetTaskId:task.id || task.Id}});
  const handleChat = () => navigate(`/${userRole}/chat`);
  // Edit / Create Task modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(() => searchParams.get('create') === '1');
  const [editingTask, setEditingTask] = useState(null);

  // Filter dropdown state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    dueDate: "any",
    statuses: [],
    priorities: [],
  });

  // Sort menu state
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [sortKey, setSortKey] = useState("task_newest");

  // Handle Menu Click (Edit task modal)
  const handleMenuClick = (taskDbId) => {
    const taskObj = tasks.find((t) => t.dbId === taskDbId);
    if (taskObj) {
      if (!isCurrentUserAssignee(taskObj) && !canEditTask) {
        toast.error("You do not have permission to edit this task");
        return;
      }
      setEditingTask(taskObj.raw || taskObj);
      setIsEditModalOpen(true);
    }
  };

  const handleAddTask = () => {
    if (!canCreateTask) return;
    setEditingTask(null);
    setIsEditModalOpen(true);
  };

  // Filter tasks by project and user assignment
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Project filter
      if (
        externalProject &&
        externalProject !== "All Projects" &&
        t.project &&
        t.project.toLowerCase() !== externalProject.toLowerCase()
      ) {
        return false;
      }
      // "My Tasks" tab: only show tasks assigned to current user
      if (activeTab === "my" && !isAssignedToUser(t, currentUserId, currentUserNames)) {
        return false;
      }
      // Status tabs are personal views for every role, including Admin.
      if (
        ["in-progress", "in-review", "change-requested", "completed"].includes(activeTab) &&
        !isAssignedToUser(t, currentUserId, currentUserNames)
      ) {
        return false;
      }
      // Status filter for status tabs
      if (["in-progress", "in-review", "change-requested", "completed"].includes(activeTab)) {
        if (activeTab === "in-progress") {
          if (t.status !== "in_progress" && t.status !== "paused") return false;
        } else if (t.status !== activeTab.replaceAll("-", "_")) {
          return false;
        }
      }
      // Due Date filter from dropdown
      if (filters.dueDate && filters.dueDate !== "any") {
        const rawDue = t.raw?.Due_Date || t.raw?.due_date;
        if (!rawDue) return false;
        const d = new Date(rawDue);
        if (isNaN(d.getTime())) return false;
        const dTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const endOfNext7 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59, 999).getTime();

        if (filters.dueDate === "overdue") {
          if (dTime >= startOfToday || t.status === "completed") return false;
        } else if (filters.dueDate === "today") {
          if (dTime !== startOfToday) return false;
        } else if (filters.dueDate === "next_7_days") {
          if (dTime <= startOfToday || dTime > endOfNext7) return false;
        }
      }

      // Status filter from dropdown
      if (Array.isArray(filters.statuses) && filters.statuses.length > 0) {
        const taskStatus = String(t.status || "").toLowerCase();
        const matches = filters.statuses.some((s) => {
          if (s === "assigned") return taskStatus === "assigned" || taskStatus === "started";
          if (s === "in_progress") return taskStatus === "in_progress" || taskStatus === "paused";
          return taskStatus === s;
        });
        if (!matches) return false;
      }

      // Priority filter from dropdown
      if (Array.isArray(filters.priorities) && filters.priorities.length > 0) {
        const taskPriority = String(t.priority || "medium").toLowerCase();
        if (!filters.priorities.includes(taskPriority)) return false;
      }

      return true;
    });
  }, [tasks, externalProject, activeTab, currentUserId, currentUserNames, filters]);

  // Compute dynamic counts for the filter dropdown
  const filterCounts = useMemo(() => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const endOfNext7 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7, 23, 59, 59, 999).getTime();

    let overdue = 0;
    let todayCount = 0;
    let next7Days = 0;

    (tasks || []).forEach((t) => {
      const rawDue = t.raw?.Due_Date || t.raw?.due_date;
      if (!rawDue) return;
      const d = new Date(rawDue);
      if (isNaN(d.getTime())) return;
      const dTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

      if (dTime < startOfToday && t.status !== "completed") {
        overdue += 1;
      } else if (dTime === startOfToday) {
        todayCount += 1;
      } else if (dTime > startOfToday && dTime <= endOfNext7) {
        next7Days += 1;
      }
    });

    return { overdue, today: todayCount, next7Days };
  }, [tasks]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.dueDate && filters.dueDate !== "any") count += 1;
    if (Array.isArray(filters.statuses) && filters.statuses.length > 0) count += filters.statuses.length;
    if (Array.isArray(filters.priorities) && filters.priorities.length > 0) count += filters.priorities.length;
    return count;
  }, [filters]);

  const currentSortOption = useMemo(() => {
    return DEFAULT_SORT_OPTIONS.find((o) => o.key === sortKey) || DEFAULT_SORT_OPTIONS[0];
  }, [sortKey]);

  const sortedTasks = useMemo(() => {
    const list = [...filteredTasks];
    if (sortKey === "task_newest") {
      list.sort((a, b) => {
        const tA = new Date(a.raw?.created_at || a.raw?.Created_At || 0).getTime();
        const tB = new Date(b.raw?.created_at || b.raw?.Created_At || 0).getTime();
        return tB - tA;
      });
    } else if (sortKey === "task_oldest") {
      list.sort((a, b) => {
        const tA = new Date(a.raw?.created_at || a.raw?.Created_At || 0).getTime();
        const tB = new Date(b.raw?.created_at || b.raw?.Created_At || 0).getTime();
        return tA - tB;
      });
    } else if (sortKey === "due_soonest") {
      list.sort((a, b) => {
        const dueA = (a.raw?.Due_Date || a.raw?.due_date) ? new Date(a.raw?.Due_Date || a.raw?.due_date).getTime() : Infinity;
        const dueB = (b.raw?.Due_Date || b.raw?.due_date) ? new Date(b.raw?.Due_Date || b.raw?.due_date).getTime() : Infinity;
        return dueA - dueB;
      });
    } else if (sortKey === "due_furthest") {
      list.sort((a, b) => {
        const dueA = (a.raw?.Due_Date || a.raw?.due_date) ? new Date(a.raw?.Due_Date || a.raw?.due_date).getTime() : -Infinity;
        const dueB = (b.raw?.Due_Date || b.raw?.due_date) ? new Date(b.raw?.Due_Date || b.raw?.due_date).getTime() : -Infinity;
        return dueB - dueA;
      });
    } else if (sortKey === "priority_highest") {
      const weight = { high: 3, medium: 2, low: 1 };
      list.sort((a, b) => (weight[String(b.priority || "medium").toLowerCase()] || 0) - (weight[String(a.priority || "medium").toLowerCase()] || 0));
    } else if (sortKey === "priority_lowest") {
      const weight = { high: 3, medium: 2, low: 1 };
      list.sort((a, b) => (weight[String(a.priority || "medium").toLowerCase()] || 0) - (weight[String(b.priority || "medium").toLowerCase()] || 0));
    }
    return list;
  }, [filteredTasks, sortKey]);

  return (
    <div
      style={{
        backgroundColor: "#F9FBFF",
        minHeight: "100%",
        padding: "24px 32px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {feedback}
      {/* ── Page Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: "800",
              color: "var(--color-slate-900)",
              margin: "0 0 4px 0",
              letterSpacing: "-0.3px",
            }}
          >
            {(() => {
              switch (activeTab) {
                case "my": return "My Tasks";
                case "in-progress": return "In Progress";
                case "in-review": return "In Review";
                case "change-requested": return "Change Requested";
                case "completed": return "Completed";
                case "all":
                default: return "All Tasks";
              }
            })()}
          </h1>
          <p
            style={{
              fontSize: "13px",
              color: "var(--color-slate-500)",
              margin: 0,
              fontWeight: "400",
            }}
          >
            {(() => {
              switch (activeTab) {
                case "my": return "Manage and track tasks assigned to you.";
                case "in-progress": return "Tasks currently in progress.";
                case "in-review": return "Tasks awaiting review.";
                case "change-requested": return "Tasks with change requests.";
                case "completed": return "Completed tasks.";
                case "all":
                default: return "View and manage tasks of all users across all projects.";
              }
            })()}
          </p>
        </div>
        {canCreateTask && (
          <button
            type="button"
            onClick={handleAddTask}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "10px 16px",
              border: "none",
              borderRadius: "8px",
              backgroundColor: "var(--color-primary, #2563EB)",
              color: "#FFFFFF",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.12)",
              whiteSpace: "nowrap",
            }}
          >
            Add Task
          </button>
        )}

      </div>

      {/* ── Tabs: All Tasks / My Tasks / In Progress / In Review / Change Requested / Completed ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--color-slate-200)",
          marginBottom: "16px",
          flexWrap: "wrap",
          rowGap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: '1 1 680px', flexWrap: 'wrap', minWidth: 0 }}>
          {(() => {
            const allTabs = [
              { key: "all", label: "All Tasks", count: counts.all },
              { key: "my", label: "My Tasks", count: counts.my },
              { key: "in-progress", label: "In Progress", count: counts["in-progress"] },
              { key: "in-review", label: "In Review", count: counts["in-review"] },
              { key: "change-requested", label: "Change Requested", count: counts["change-requested"] },
              { key: "completed", label: "Completed", count: counts.completed },
            ];
            // Hide "All Tasks" tab for regular users (non-PM, non-Admin)
            const visibleTabs = userRole === "user"
              ? allTabs.filter(tab => tab.key !== "all")
              : allTabs;
            return visibleTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                style={{
                  background: "none",
                  border: "none",
                  padding: "6px 10px",
                  fontSize: "13px",
                  fontWeight: activeTab === tab.key ? "700" : "500",
                  color: activeTab === tab.key ? "var(--color-primary, #2563EB)" : "var(--color-slate-500)",
                  borderBottom: activeTab === tab.key ? "2.5px solid var(--color-primary, #2563EB)" : "2.5px solid transparent",
                  marginBottom: "-1px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: "700",
                    padding: "1px 5px",
                    borderRadius: "8px",
                    backgroundColor: activeTab === tab.key ? "#EFF6FF" : "var(--color-slate-100)",
                    color: activeTab === tab.key ? "var(--color-primary, #2563EB)" : "var(--color-slate-500)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {tab.count}
                </span>
              </button>
            ));
          })()}
        </div>

        {/* Filter and Sort Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, marginLeft: "12px", marginBottom: "2px", position: "relative" }}>
          <button
            type="button"
            data-filter-trigger="true"
            onClick={() => setIsFilterOpen((prev) => !prev)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "6px 10px",
              fontSize: "12px",
              fontWeight: "600",
              backgroundColor: activeFilterCount > 0 ? "#EFF6FF" : "#FFFFFF",
              color: activeFilterCount > 0 ? "#1558D6" : "#475569",
              border: activeFilterCount > 0 ? "1px solid #1558D6" : "1px solid #CBD5E1",
              borderRadius: "6px",
              cursor: "pointer",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>

          <FilterDropdown
            isOpen={isFilterOpen}
            onClose={() => setIsFilterOpen(false)}
            filters={filters}
            onChange={(newFilters) => setFilters(newFilters)}
            onApply={(newFilters) => {
              setFilters(newFilters);
              setIsFilterOpen(false);
            }}
            onClear={() => {
              setFilters({ dueDate: "any", statuses: [], priorities: [] });
            }}
            counts={filterCounts}
          />

          <div style={{ position: "relative" }}>
            <button
              type="button"
              data-sort-trigger="true"
              onClick={() => setIsSortOpen((prev) => !prev)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "6px 10px",
                fontSize: "12px",
                fontWeight: "600",
                backgroundColor: isSortOpen || sortKey !== "task_newest" ? "#EFF6FF" : "#FFFFFF",
                color: isSortOpen || sortKey !== "task_newest" ? "#1558D6" : "#475569",
                border: isSortOpen || sortKey !== "task_newest" ? "1px solid #1558D6" : "1px solid #CBD5E1",
                borderRadius: "6px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
              Sort {currentSortOption.label} {currentSortOption.detail}
            </button>

            <SortMenu
              isOpen={isSortOpen}
              onClose={() => setIsSortOpen(false)}
              value={sortKey}
              onChange={(newKey) => setSortKey(newKey)}
            />
          </div>
        </div>
      </div>

      {/* ── Content View ── */}
      {loading ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 20px",
            background: "#FFFFFF",
            borderRadius: "12px",
            border: "1px solid #E2E8F0",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              border: "3px solid #E2E8F0",
              borderTopColor: "var(--color-primary, #2563EB)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <p style={{ marginTop: "14px", color: "#64748B", fontSize: "14px", fontWeight: "500" }}>
            Loading tasks from database...
          </p>
        </div>
      ) : error ? (
        <div
          style={{
            padding: "36px 20px",
            background: "#FEF2F2",
            border: "1px solid #FCA5A5",
            borderRadius: "12px",
            textAlign: "center",
          }}
        >
          <p style={{ color: "#B91C1C", fontWeight: "600", fontSize: "14px", margin: "0 0 10px 0" }}>
            {error}
          </p>
          <button
            type="button"
            onClick={fetchTasks}
            style={{
              padding: "6px 14px",
              backgroundColor: "#DC2626",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "13px",
            }}
          >
            Retry Connection
          </button>
        </div>
      ) : sortedTasks.length > 0 ? (
        /* Accordion Task List: one open at a time */
        <TaskList
          toast={toast}
          currentUserRole={userRole}
          tasks={sortedTasks}
          currentUserId={currentUserId}
          currentUserNames={currentUserNames}
          canEditTask={canEditTask}
          canDeleteTask={canDeleteTask}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
          onAddDependencyClick={handleAddDependency}
          onChat={handleChat}
          onMenuClick={handleMenuClick}
        />
      ) : (
        /* Empty State */
        <div
          style={{
            backgroundColor: "var(--color-white, #FFFFFF)",
            borderRadius: "12px",
            border: "1px solid var(--color-slate-200, #E2E8F0)",
            padding: "48px 24px",
            textAlign: "center",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: "44px",
              color: "var(--color-slate-400, #94A3B8)",
              marginBottom: "12px",
              display: "inline-block",
            }}
          >
            assignment_late
          </span>
          <h3
            style={{
              fontSize: "16px",
              fontWeight: "700",
              color: "var(--color-slate-800, #1E293B)",
              margin: "0 0 6px 0",
            }}
          >
            No tasks found
          </h3>
          <p
            style={{
              fontSize: "13px",
              color: "var(--color-slate-500, #64748B)",
              margin: "0 auto",
              maxWidth: "420px",
              lineHeight: "1.4",
            }}
          >
            {activeTab === "my"
              ? "You do not have any tasks assigned to you."
              : externalProject
                ? `There are no tasks under "${externalProject}".`
                : "No tasks found."}
          </p>
        </div>
      )}

      {/* ── Edit / Create Task Modal ── */}
      {isEditModalOpen && (
        <EditTaskPage
          isOpen={isEditModalOpen}
          isCreate={!editingTask?.Id && !editingTask?.id && !editingTask?.dbId}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingTask(null);
          }}
          task={editingTask || {}}
          projectId={externalProjectId}
          projects={projects}
          onSave={async (payload) => {
            const taskId = editingTask?.Id || editingTask?.id || editingTask?.dbId;
            const isEditing = Boolean(taskId);
            try {
              await saveTask({ projectId: externalProjectId, task: editingTask || {}, values: payload });
              setIsEditModalOpen(false); setEditingTask(null); await fetchTasks();
              toast.success(isEditing ? 'Task updated.' : 'Task created.');
            } catch (error) { toast.error(errorMessage(error)); throw error; }

          }}
        />
      )}


    </div>
  );
}
