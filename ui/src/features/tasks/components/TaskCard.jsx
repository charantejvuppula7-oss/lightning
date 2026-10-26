import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { apiRequest, apiUpload } from '../../../services/api/apiClient.js';
import ReviewButton from "./ReviewButton";
import MarkAsCompletedButton from "./MarkAsCompletedButton";
import TaskMoreOption from "./TaskMoreOption";

// Import button components from the buttons folder
import StatusButton, { StatusIcon } from "./StatusButton";
import PriorityButton, { PriorityIcon } from "./PriorityButton";
import TaskTimerButton from "./TaskTimerButton";
import UserCard from "./UserCard";
import { DependencyBadge } from "./DependencyIcon";
import { SprintBadge } from "./SprintIcon";

// Import the ChangeRequestCard (shown only when status is change_requested)
import ChangeRequestCard from "./ChangeRequestCard";
import TaskReview from "./taskreview.jsx";

const STYLES = `
  /* ─── Task Card Container ─── */
  .task-card {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    overflow: hidden;
    box-sizing: border-box;
    transition: box-shadow 0.2s ease, border-color 0.2s ease;
  }
  .task-card:hover {
    border-color: #CBD5E1;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  /* ─── Header Row (always visible) ─── */
  .task-card-header {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 14px 16px 10px 16px;
    cursor: pointer;
    user-select: none;
    position: relative;
  }

  /* Chevron toggle */
  .task-card-chevron {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #64748B;
    margin-top: 2px;
    transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1), color 0.15s ease;
  }
  .task-card-chevron--open {
    transform: rotate(90deg);
    color: #334155;
  }

  /* Main header info (left side) */
  .task-card-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  /* Row 1: ID + Name + Status + Priority + Dependency */
  .task-card-row1 {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .task-card-id {
    font-size: 13px;
    font-weight: 600;
    color: #64748B;
    white-space: nowrap;
  }
  .task-card-name {
    font-size: 15px;
    font-weight: 700;
    color: #0F172A;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 240px;
  }
  .task-card-dep-icon {
    display: inline-flex;
    align-items: center;
    color: #475569;
    cursor: pointer;
  }
  .task-card-dep-icon:hover {
    color: #1E293B;
  }

  /* Row 2: Breadcrumb */
  .task-card-breadcrumb {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #64748B;
    flex-wrap: wrap;
  }
  .task-card-subtitle {
    font-size: 12px;
    color: #475569;
    line-height: 1.35;
  }
  .task-card-breadcrumb span {
    white-space: nowrap;
  }
  .task-card-breadcrumb-sep {
    color: #94A3B8;
    font-size: 11px;
  }

  /* Row 3: Sprint + Points */
  .task-card-sprint-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 2px;
  }
  .task-card-sprint-icon {
    display: inline-flex;
    align-items: center;
    color: #2563EB;
  }
  .task-card-sprint {
    font-size: 13px;
    font-weight: 600;
    color: #2563EB;
  }
  .task-card-points {
    font-size: 13px;
    font-weight: 600;
    color: #2563EB;
  }

  /* Right side of header: Due date + Timer + Menu */
  .task-card-right {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }
  .task-card-due {
    font-size: 13px;
    font-weight: 500;
    color: #475569;
    white-space: nowrap;
  }
  .task-card-due strong {
    color: #0F172A;
  }
  /* ─── Expanded Body ─── */
  .task-card-body {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .task-card-body--open {
    max-height: 800px;
  }
  .task-card-body-inner {
    padding: 12px 24px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* Divider */
  .task-card-divider {
    height: 1px;
    background: #E2E8F0;
    margin: 0 24px;
  }

  /* Task Details Section */
  .task-card-details-title {
    font-size: 14px;
    font-weight: 700;
    color: #0F172A;
    margin: 0;
  }
  .task-card-desc-label {
    font-size: 13px;
    font-weight: 600;
    color: #334155;
    margin: 0 0 2px;
  }
  .task-card-desc {
    font-size: 13px;
    color: #475569;
    line-height: 1.5;
    margin: 0;
  }

  /* Info grid: Priority | Dependency | Assigned by | Assigned to | Reviewer */
  .task-card-info-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    align-items: center;
    gap: 12px;
    border: 1px solid #D1D5DB;
    border-radius: 8px;
    padding: 10px 12px;
    background: #F1F2F4;
  }
  .task-card-info-col {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
    min-width: 0;
  }
  .task-card-info-label {
    font-size: 13px;
    font-weight: 500;
    color: #64748B;
  }
  .task-card-info-value {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #0F172A;
    font-weight: 500;
  }
  .task-card-dependency-count {
    padding: 0;
    border: 0;
    background: transparent;
    color: #2563EB;
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
  }
  .task-card-dependency-count--static { cursor: default; text-decoration: none; }

  /* Action bar */
  .task-card-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    border-top: 1px solid #E2E8F0;
    padding-top: 12px;
  }
  .task-card-action-secondary {
    background: transparent;
    color: #334155;
    border: none;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 18px;
    border-radius: 8px;
    background: #F1F2F4;
    min-height: 44px;
    transition: background-color 0.15s ease;
  }
  .task-card-action-secondary:hover {
    background: #E5E7EB;
  }

  @media (max-width: 760px) {
    .task-card-info-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }
  @media (max-width: 540px) {
    .task-card-row1 { flex-wrap: wrap; }
    .task-card-right { flex-wrap: wrap; }
    .task-card-info-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .task-card-body-inner { padding: 12px 16px 16px; }
    .task-card-divider { margin: 0 16px; }
  }
  @media (max-width: 360px) {
    .task-card-info-grid { grid-template-columns: 1fr; }
  }
`;

/**
 * Task Component
 *
 * Collapsible task card. Closed by default — shows summary row.
 * When opened, shows Task Details, info grid, action bar, and
 * ChangeRequestCard (only if status === "change_requested").
 *
 * @param {Object} props
 * @param {Object} props.task - Task data object
 * @param {boolean} [props.isOpen=false] - Controlled open state
 * @param {function} [props.onToggle] - Callback when toggled (taskId, isOpen)
 * @param {function} [props.onAddDependency] - Add dependency handler
 * @param {function} [props.onChat] - Chat handler
 * @param {function} [props.onMenuClick] - Three-dot menu handler
 */
function TaskCard({
  toast,
  canReviewTask = false,
  task = {},
  variant = "task",
  sequenceNumber = null,
  subtitle = "",
  headerBadge = null,
  headerAction = null,
  detailsContent = null,
  detailsActions = null,
  isOpen: controlledOpen,
  onToggle,
  onAddDependency,
  onChat,
  onMenuClick,
  onTaskUpdate,
  onTimerToggle,
  onTaskDelete,
  canEditTask = false,
  canDeleteTask = false,
  isAssignedUser = false,
  isTaskAssigner = false,
  className = "",
  style = {},
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [internalOpen, setInternalOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const isControlled = typeof controlledOpen === "boolean";
  const isOpen = isControlled ? controlledOpen : internalOpen;

  // Defaults
  const {
    id = "",
    name = "",
    status = "assigned",
    priority = "medium",
    description = "",
    project = "",
    milestone = null,
    feature = null,
    sprint = "",
    points = null,
    dueDate = "",
    timerStatus = "default",
    timerSeconds = 0,
    dependencyCount = 0,
    assignedBy = {},
    assignedTo = [],
    reviewer = {},
    changeRequests = [],
    isReopened: propIsReopened = false,
    reopenCount = 0,
    resentForReview: propResentForReview = false,
  } = task;

  const [isReopened, setIsReopened] = useState(Boolean(propIsReopened || task.isReopened || task.reopened || task.raw?.reopened));
  const [resentForReview, setResentForReview] = useState(Boolean(propResentForReview || task.resent_for_review || task.raw?.resent_for_review));



  const handleToggle = () => {
    const next = !isOpen;
    if (!isControlled) setInternalOpen(next);
    if (onToggle) onToggle(id, next);
  };

  const taskId = task.dbId || task.Id || task.id;
  const hasReviewer = Boolean(reviewer?.id && String(reviewer.id).toLowerCase() !== "null");
  const updateTask = (patch) => onTaskUpdate?.(taskId, patch);

  const sendStatusUpdate = async (nextStatus, extra = {}) => {
    if (!extra.files?.length) return apiRequest(`/tasks/${taskId}/status/`, { method: 'PATCH', body: { status: nextStatus, ...(extra.description ? { description: extra.description } : {}), ...(extra.links?.length ? { links: extra.links } : {}) } });
    const form = new FormData(); form.append('status', nextStatus);
    form.append('description', extra.description || '');
    form.append('links', JSON.stringify(extra.links || []));
    extra.files.forEach(file => form.append('files', file));
    return apiUpload(`/tasks/${taskId}/status/`, form, { method: 'PATCH' });
  };

  const handleTimerToggle = async (nextTimerStatus, currentSeconds) => {
    if (!isAssignedUser) return toast.error("Only the assigned user can update this task");
    // Once started, running or pausing the timer must always remain in_progress
    const backendStatus = nextTimerStatus === "paused" ? "paused" : nextTimerStatus === "completed" ? "completed" : "in_progress";
    try {
      await sendStatusUpdate(backendStatus);
      updateTask({
        status: "in_progress",
        timerStatus: nextTimerStatus,
        timerSeconds: currentSeconds !== undefined ? currentSeconds : timerSeconds,
      });
      toast.success(nextTimerStatus === "paused" ? "Timer paused" : "Task in progress");
    } catch (error) {
      toast.error(error.message || "Error communicating with server");
    }
  };

  const handleCompleteTask = async () => {

    try {
      await sendStatusUpdate("completed");
      updateTask({ status: "completed", timerStatus: "completed" });
      toast.success("Task marked as completed");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleReopenTask = async () => {
    try {
      await sendStatusUpdate("started", { reopened: true });
      const nextReopenCount = Math.max(0, Number(reopenCount) || 0) + 1;
      setIsReopened(true);
      updateTask({ status: "assigned", isReopened: true, reopenCount: nextReopenCount, timerStatus: "default", timerSeconds: 0 });
      toast.success("Task reopened");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSendForReview = () => {
    if (!isAssignedUser) return toast.error("Only the assigned user can send this task for review");
    setIsReviewOpen(true);
  };

  const handleConfirmReview = async ({ description, files, links }) => {
    const isResubmission = isReopened || status === "change_requested" || changeRequests.length > 0;
    try {
      await sendStatusUpdate("in_review", {
        description: description || "Task submitted for review by employee",
        links: links || [],
        files: files || [],
      });
      setIsReopened(false);
      setResentForReview(isResubmission);
      updateTask({ status: "in_review", isReopened: false, resentForReview: isResubmission });
      toast.success(isResubmission ? "Task resent for review!" : "Task sent for review!");
      setIsReviewOpen(false);
    } catch (error) {
      toast.error(error.message || "Network error while submitting task for review");
      throw error;
    }
  };

  const handleAddDependency = () => {
    if (status === "completed") return;
    if (onAddDependency) return onAddDependency(task.raw || task);
    toast.info("Opening dependency settings for task #" + String(taskId).slice(0, 6));
  };

  const handleViewDependencyDetails = () => {
    const prefix = location.pathname.startsWith("/admin")
      ? "/admin"
      : location.pathname.startsWith("/pm")
      ? "/pm"
      : "/user";

    const depId =
      task.dependencyId ||
      task.dependency_id ||
      task.depId ||
      (Array.isArray(task.dependencies) && task.dependencies[0]?.id) ||
      (Array.isArray(task.raw?.dependencies) && task.raw?.dependencies[0]?.id) ||
      null;
    const tId = taskId || task.dbId || task.id;

    navigate(`${prefix}/dependencies?taskId=${tId}${depId ? `&dependencyId=${depId}` : ""}`, {
      state: {
        targetTaskId: tId,
        targetDepId: depId,
        targetDependencyId: depId,
      },
    });
  };

  const handleDeleteTask = async () => {
    if (!canDeleteTask) return toast.error("You do not have permission to delete this task");
    if (!window.confirm("Delete this task?")) return;
    try {
      await apiRequest(`/tasks/${taskId}/`, { method: "DELETE" });
      onTaskDelete?.(taskId);
      toast.success("Task deleted");
    } catch (error) {
      toast.error(error.message || "Network error deleting task");
    }
  };


  return (
    <>
      <style>{STYLES}</style>
      <div className={`task-card ${className}`.trim()} style={style}>
        {/* ─── Header (Always Visible) ─── */}
        <div className="task-card-header" onClick={handleToggle}>
          {/* Chevron */}
          <span className={`task-card-chevron ${isOpen ? "task-card-chevron--open" : ""}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </span>

          {/* Info */}
          <div className="task-card-info">
            {/* Row 1: ID + Name + Status + Priority + Dep */}
            <div className="task-card-row1">
              {sequenceNumber != null ? (
                <span className="task-card-id">Task {sequenceNumber}</span>
              ) : id && <span className="task-card-id">#{id}</span>}
              <span className="task-card-name">{name}</span>
              {variant === "task" && <StatusIcon status={status} size={18} />}
              {variant === "task" && (
                <StatusButton
                  status={status}
                  size="sm"
                  showIcon={false}
                  style={{ padding: "2px 4px", fontSize: "12px", gap: "4px" }}
                />
              )}
              {headerBadge}
              <PriorityIcon priority={priority} size={22} showTooltip />
              {/* Dependency icon - only show when there are dependencies */}
              {dependencyCount > 0 && (
                <DependencyBadge
                  count={dependencyCount}
                  showCount
                  iconSize={20}
                  onViewDetails={handleViewDependencyDetails}
                  onAddDependency={handleAddDependency}
                />
              )}
            </div>

            {subtitle && <div className="task-card-subtitle">{subtitle}</div>}

            {/* Row 2: Breadcrumb - only show project, milestone, feature if they exist */}
            {(project || milestone || feature) && (
              <div className="task-card-breadcrumb">
                {project && <span>{project}</span>}
                {milestone && (
                  <>
                    {project && <span className="task-card-breadcrumb-sep">›</span>}
                    <span>{milestone}</span>
                  </>
                )}
                {feature && (
                  <>
                    {(project || milestone) && <span className="task-card-breadcrumb-sep">›</span>}
                    <span>{feature}</span>
                  </>
                )}
              </div>
            )}

            {/* Row 3: Sprint + Points */}
            {(sprint || (points !== null && points !== undefined)) && (
              <div className="task-card-sprint-row">
              <SprintBadge sprint={sprint} points={points} />
              </div>
            )}
          </div>

          {/* Right side: Due + Timer + Menu */}
          <div className="task-card-right" onClick={(e) => e.stopPropagation()}>
            {dueDate && <span className="task-card-due">Due: <strong>{dueDate}</strong></span>}
            {variant === "dependency" ? (
              <>
                {headerAction}
                <TaskTimerButton key={`${timerStatus}-${timerSeconds}`}
                  variant={timerStatus}
                  seconds={timerSeconds}
                  autoTick={variant !== "dependency" && timerStatus === "running"}
                  size="sm"
                  onToggle={onTimerToggle}
                  disabled={!isAssignedUser || status === "in_review" || status === "completed" || status === "rejected"}
                />
              </>
            ) : (
              <>
                <TaskTimerButton key={`${timerStatus}-${timerSeconds}`}
                  variant={timerStatus}
                  seconds={timerSeconds}
                  autoTick={timerStatus === "running"}
                  size="sm"
                  onToggle={handleTimerToggle}
                  disabled={!isAssignedUser || status === "in_review" || status === "completed" || status === "rejected"}
                />
                {(canEditTask || canDeleteTask || isAssignedUser) && (
                  <TaskMoreOption onEdit={onMenuClick} onDelete={handleDeleteTask} />
                )}
              </>
            )}
          </div>
        </div>

        {/* ─── Divider ─── */}
        {isOpen && <div className="task-card-divider" />}

        {/* ─── Expanded Body ─── */}
        <div className={`task-card-body ${isOpen ? "task-card-body--open" : ""}`}>
          <div className="task-card-body-inner">
            {/* Task Details */}
            <h4 className="task-card-details-title">Task Details</h4>
            {changeRequests.length > 0 && (
              <ChangeRequestCard
                variant={status === "completed" ? "completed" : "requested"}
                count={changeRequests.length}
                changes={changeRequests[0]?.changes || []}
                attachments={changeRequests[0]?.attachments || []}
                date={changeRequests[0]?.date || ""}
                history={changeRequests}
              />
            )}
            <div>
              <p className="task-card-desc-label">Description</p>
              <p className="task-card-desc">{description}</p>
            </div>

            {/* Info Grid */}
            <div className="task-card-info-grid">
              {/* Priority */}
              <div className="task-card-info-col">
                <span className="task-card-info-label">Priority</span>
                <div className="task-card-info-value">
                  <PriorityButton priority={priority} size="sm" showText />
                </div>
              </div>

              {variant === "task" && <div className="task-card-info-col">
                <span className="task-card-info-label">Dependency</span>
                <div className="task-card-info-value">
                  {dependencyCount > 0 && (
                    <button
                      type="button"
                      className="task-card-dependency-count"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDependencyDetails();
                      }}
                      aria-label={`${dependencyCount} dependencies`}
                      title="View dependency details"
                    >
                      {dependencyCount}
                    </button>
                  )}
                </div>
              </div>}

              {/* Assigned by */}
              <div className="task-card-info-col">
                <span className="task-card-info-label">Assigned by</span>
                <div className="task-card-info-value">
                  <UserCard
                    name={assignedBy.name || "Unknown"}
                    initials={assignedBy.initials}
                    color={assignedBy.color}
                    role="Assigned by"
                    size="sm"
                  />
                  <span>{assignedBy.name || "Unknown"}</span>
                </div>
              </div>

              {/* Assigned to */}
              {variant === "task" && <div className="task-card-info-col">
                <span className="task-card-info-label">Assigned to</span>
                <div className="task-card-info-value">
                  {assignedTo.length ? assignedTo.map((u, i) => (
                    <UserCard
                      key={i}
                      name={u.name}
                      initials={u.initials}
                      color={u.color}
                      role="Assignee"
                      size="sm"
                    />
                  )) : <span>Unassigned</span>}
                </div>
              </div>}

              {/* Reviewer */}
              <div className="task-card-info-col">
                <span className="task-card-info-label">Reviewer</span>
                <div className="task-card-info-value">
                  {reviewer?.id ? (
                    <>
                      <UserCard
                        name={reviewer.name}
                        initials={reviewer.initials}
                        color={reviewer.color}
                        role="Reviewer"
                        size="sm"
                      />
                      <span>{reviewer.name}</span>
                    </>
                  ) : <span>N/A</span>}
                </div>
              </div>
            </div>

            {detailsContent}

            {/* State-specific actions */}
            <div className="task-card-actions">
              {variant === "dependency" ? detailsActions : <>
              {status === "in_review" ? (
                <>
                {canReviewTask && <MarkAsCompletedButton onClick={handleCompleteTask} />}
                {canReviewTask && <button type="button" className="task-card-action-secondary" onClick={async () => {
                  const description = window.prompt('Describe the changes needed:');
                  if (!description?.trim()) return;
                  try { await sendStatusUpdate('change_requested', { description: description.trim() }); updateTask({}); }
                  catch (error) { toast.error(error.message); }
                }}>Request Changes</button>}
                <ReviewButton state="sent" disabled>
                  {resentForReview || changeRequests.length > 0 ? "Resent for review" : "Sent for review"}
                </ReviewButton></>
              ) : status === "completed" ? (
                (canEditTask || isAssignedUser) && (
                  <ReviewButton variant={reopenCount > 0 ? "reopen" : "reopen-secondary"} onClick={handleReopenTask}>Reopen</ReviewButton>
                )
              ) : isReopened && isTaskAssigner ? (
                <ReviewButton state="reopened" disabled>Reopened</ReviewButton>
              ) : hasReviewer && (status === "change_requested" || isReopened) ? (
                isAssignedUser && (
                  <ReviewButton variant="resend" onClick={handleSendForReview}>Send for review</ReviewButton>
                )
              ) : hasReviewer ? (
                isAssignedUser && (
                  <ReviewButton variant="send" onClick={handleSendForReview}>Send for review</ReviewButton>
                )
              ) : isAssignedUser ? (
                <MarkAsCompletedButton onClick={handleCompleteTask} />
              ) : null}
              {status !== "completed" && (
                <button type="button" className="task-card-action-secondary" onClick={handleAddDependency}>
                  + Add Dependency
                </button>
              )}
              <button type="button" className="task-card-action-secondary" onClick={onChat}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  <circle cx="9" cy="10" r="1" fill="currentColor" /><circle cx="12" cy="10" r="1" fill="currentColor" /><circle cx="15" cy="10" r="1" fill="currentColor" />
                </svg>
                Chat
              </button>
              </>}
            </div>
          </div>
        </div>
      </div>
      <TaskReview
        toast={toast}
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        task={task.raw || task}
        onSubmit={handleConfirmReview}
      />
    </>
  );
}


export default TaskCard;
