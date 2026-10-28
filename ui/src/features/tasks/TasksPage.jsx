import normalizeTask from './normalizeTask.js';
import { saveTask } from './saveTask.js';
import { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiList, errorMessage } from '../../shared/api/apiClient.js';
import { useFeedback } from '../../shared/components/Feedback.jsx';
import { ProjectSelectionContext } from '../projects/projectSelectionContext.js';
import { hasSidebarPermission } from '../../layouts/Sidebar.jsx';
import { roleSlug } from '../../shared/utils/roles.js';
import TaskCard from './TaskCard.jsx';
import EditTaskPage from './TaskEditor.jsx';
import FilterDropdown from './FilterDropdown.jsx';
import SortMenu from './SortMenu.jsx';
import { DEFAULT_SORT_OPTIONS } from './sortOptions.js';
const EMPTY_FILTERS = { dueDate: 'any', statuses: [], priorities: [], assignedTo: '' };
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
            isAssignedUser={isAssignedToUser(task, currentUserId)}
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
function isAssignedToUser(task, userId) {
  return Boolean(task?.assignedTo?.some((assignee) =>
    userId && assignee.id && String(assignee.id) === String(userId)
  ));
}

export default function TasksPage({ user: currentUser }) {
  const { projects, selectedProjectId: externalProjectId } = useContext(ProjectSelectionContext);
  const externalProject = projects.find(project => project.id === externalProjectId)?.project_name || '';
  const currentUserId = currentUser.id;
  const userRole = ['admin', 'pm'].includes(roleSlug(currentUser.role)) ? roleSlug(currentUser.role) : 'user';
  const admin = userRole === 'admin';
  const canEditTask = admin || hasSidebarPermission(currentUser.permissions, 'Tasks', 'Edit');
  const canDeleteTask = admin || hasSidebarPermission(currentUser.permissions, 'Tasks', 'Delete');
  const canCreateTask = Boolean(externalProjectId) && (admin || hasSidebarPermission(currentUser.permissions, 'Tasks', 'Create'));
  const isCurrentUserAssignee = task => isAssignedToUser(task, currentUserId);
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
    try { setTasks((await apiList(`/tasks/?page_size=100${externalProjectId && externalProjectId !== 'all' ? `&project=${externalProjectId}` : ''}`, { signal })).map(normalizeTask)); }
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
  const myTasks = tasks.filter(task => isAssignedToUser(task, currentUserId));
  const counts = { all: tasks.length, my: myTasks.length,
    'in-progress': myTasks.filter(task => task.status === 'in_progress').length,
    'in-review': myTasks.filter(task => task.status === 'in_review').length,
    'change-requested': myTasks.filter(task => task.status === 'change_requested').length,
    completed: myTasks.filter(task => task.status === 'completed').length };
  const handleTaskUpdate = (id, patch) => setTasks(previous => previous.map(task => task.dbId === String(id)
    ? { ...(patch.raw ? normalizeTask(patch.raw) : task), ...patch } : task));
  const handleTaskDelete = id => setTasks(previous => previous.filter(task => task.dbId !== String(id)));
  const handleAddDependency = task => navigate(`/${userRole}/dependencies?taskId=${task.id || task.Id}`, {state:{targetTaskId:task.id || task.Id}});
  const handleChat = () => navigate(`/${userRole}/chat`);
  // Edit / Create Task modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(() => searchParams.get('create') === '1');
  const [editingTask, setEditingTask] = useState(null);

  // Filter dropdown state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  useEffect(() => {
    // Project-scoped filters must not carry into another project's results.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilters(EMPTY_FILTERS);
  }, [externalProjectId]);
  const canFilterAssignee = userRole !== 'user' && activeTab === 'all';
  const assignees = useMemo(() => [...new Map(tasks.flatMap(task => task.assignedTo)
    .filter(person => person.id).map(person => [String(person.id), person])).values()]
    .sort((a, b) => a.name.localeCompare(b.name)), [tasks]);

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
      if (activeTab === "my" && !isAssignedToUser(t, currentUserId)) {
        return false;
      }
      // Status tabs are personal views for every role, including Admin.
      if (
        ["in-progress", "in-review", "change-requested", "completed"].includes(activeTab) &&
        !isAssignedToUser(t, currentUserId)
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
      if (canFilterAssignee && filters.assignedTo && !isAssignedToUser(t, filters.assignedTo)) {
        return false;
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
  }, [tasks, externalProject, activeTab, currentUserId, filters, canFilterAssignee]);

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
    if (canFilterAssignee && filters.assignedTo) count += 1;
    return count;
  }, [filters, canFilterAssignee]);

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
      className="[background-color:#F9FBFF]! min-h-[100%]! p-[24px_32px]! w-full! box-border!"
    >
      {feedback}
      {/* ── Page Header ── */}
      <div
        className="flex! items-start! justify-between! mb-[20px]! flex-wrap! gap-[12px]!"
      >
        <div>
          <h1
            className="text-[24px]! font-extrabold! [color:var(--color-slate-900)]! m-[0_0_4px_0]! tracking-[-0.3px]!"
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
            className="text-[13px]! [color:var(--color-slate-500)]! m-0! font-normal!"
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
            className="inline-flex! items-center! justify-center! gap-[8px]! p-[10px_16px]! border-0! rounded-[8px]! [background-color:var(--color-primary,_#2563EB)]! [color:#FFFFFF]! text-[14px]! font-semibold! cursor-pointer! [box-shadow:0_1px_2px_rgba(15,_23,_42,_0.12)]! whitespace-nowrap!"
          >
            Add Task
          </button>
        )}

      </div>

      {/* ── Tabs: All Tasks / My Tasks / In Progress / In Review / Change Requested / Completed ── */}
      <div
        className="flex! items-center! justify-between! [border-bottom:1px_solid_var(--color-slate-200)]! mb-[16px]! flex-wrap! gap-y-[10px]!"
      >
        <div className="flex! items-center! gap-[4px]! [flex:1_1_680px]! flex-wrap! min-w-0!">
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
                className="[background:none]! border-0! p-[6px_10px]! text-[13px]! mb-[-1px]! cursor-pointer! flex! items-center! gap-[4px]! [transition:all_0.15s_ease]! whitespace-nowrap! shrink-0!" style={{
  fontWeight: activeTab === tab.key ? "700" : "500",
  color: activeTab === tab.key ? "var(--color-primary, #2563EB)" : "var(--color-slate-500)",
  borderBottom: activeTab === tab.key ? "2.5px solid var(--color-primary, #2563EB)" : "2.5px solid transparent"
}}
              >
                <span>{tab.label}</span>
                <span
                  className="text-[10px]! font-bold! p-[1px_5px]! rounded-[8px]! [transition:all_0.15s_ease]!" style={{
  backgroundColor: activeTab === tab.key ? "#EFF6FF" : "var(--color-slate-100)",
  color: activeTab === tab.key ? "var(--color-primary, #2563EB)" : "var(--color-slate-500)"
}}
                >
                  {tab.count}
                </span>
              </button>
            ));
          })()}
        </div>

        {/* Filter and Sort Buttons */}
        <div className="flex! items-center! gap-[6px]! shrink-0! ml-[12px]! mb-[2px]! relative!">
          <button
            type="button"
            data-filter-trigger="true"
            onClick={() => setIsFilterOpen((prev) => !prev)}
            className="inline-flex! items-center! gap-[4px]! p-[6px_10px]! text-[12px]! font-semibold! rounded-[6px]! cursor-pointer! [transition:all_0.15s_ease]! whitespace-nowrap!" style={{
  backgroundColor: activeFilterCount > 0 ? "#EFF6FF" : "#FFFFFF",
  color: activeFilterCount > 0 ? "#1558D6" : "#475569",
  border: activeFilterCount > 0 ? "1px solid #1558D6" : "1px solid #CBD5E1"
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
            assignees={canFilterAssignee ? assignees : undefined}
            onChange={(newFilters) => setFilters(newFilters)}
            onApply={(newFilters) => {
              setFilters(newFilters);
              setIsFilterOpen(false);
            }}
            onClear={() => {
              setFilters(EMPTY_FILTERS);
            }}
            counts={filterCounts}
          />

          <div className="relative!">
            <button
              type="button"
              data-sort-trigger="true"
              onClick={() => setIsSortOpen((prev) => !prev)}
              className="inline-flex! items-center! gap-[4px]! p-[6px_10px]! text-[12px]! font-semibold! rounded-[6px]! cursor-pointer! [transition:all_0.15s_ease]! whitespace-nowrap!" style={{
  backgroundColor: isSortOpen || sortKey !== "task_newest" ? "#EFF6FF" : "#FFFFFF",
  color: isSortOpen || sortKey !== "task_newest" ? "#1558D6" : "#475569",
  border: isSortOpen || sortKey !== "task_newest" ? "1px solid #1558D6" : "1px solid #CBD5E1"
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
          className="flex! flex-col! items-center! justify-center! p-[60px_20px]! [background:#FFFFFF]! rounded-[12px]! [border:1px_solid_#E2E8F0]!"
        >
          <div
            className="w-[32px]! h-[32px]! [border:3px_solid_#E2E8F0]! [border-top-color:var(--color-primary,_#2563EB)]! rounded-[50%]! [animation:spin_0.8s_linear_infinite]!"
          />

          <p className="mt-[14px]! [color:#64748B]! text-[14px]! font-medium!">
            Loading tasks from database...
          </p>
        </div>
      ) : error ? (
        <div
          className="p-[36px_20px]! [background:#FEF2F2]! [border:1px_solid_#FCA5A5]! rounded-[12px]! text-center!"
        >
          <p className="[color:#B91C1C]! font-semibold! text-[14px]! m-[0_0_10px_0]!">
            {error}
          </p>
          <button
            type="button"
            onClick={fetchTasks}
            className="p-[6px_14px]! [background-color:#DC2626]! [color:#FFFFFF]! border-0! rounded-[6px]! cursor-pointer! font-semibold! text-[13px]!"
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
          className="[background-color:var(--color-white,_#FFFFFF)]! rounded-[12px]! [border:1px_solid_var(--color-slate-200,_#E2E8F0)]! p-[48px_24px]! text-center! [box-shadow:0_1px_3px_rgba(0,_0,_0,_0.02)]!"
        >
          <span
            className={"material-symbols-outlined" + " " + "text-[44px]! [color:var(--color-slate-400,_#94A3B8)]! mb-[12px]! inline-block!"}

          >
            assignment_late
          </span>
          <h3
            className="text-[16px]! font-bold! [color:var(--color-slate-800,_#1E293B)]! m-[0_0_6px_0]!"
          >
            No tasks found
          </h3>
          <p
            className="text-[13px]! [color:var(--color-slate-500,_#64748B)]! m-[0_auto]! max-w-[420px]! leading-[1.4]!"
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
            try {
              await saveTask({ projectId: externalProjectId, task: editingTask || {}, values: payload });
              setIsEditModalOpen(false); setEditingTask(null); await fetchTasks();
            } catch (error) { toast.error(errorMessage(error)); throw error; }

          }}
        />
      )}

    </div>
  );
}
