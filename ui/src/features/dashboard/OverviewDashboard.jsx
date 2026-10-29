import { useState } from 'react'
import ReviewDrawer from '../approvals/ReviewDrawer.jsx'
import CreateTaskDialog from '../tasks/CreateTaskDialog.jsx'
import { useNavigate } from 'react-router-dom'
import useApiData from '../../shared/hooks/useApiData.js'
import { useProjectSelection } from '../projects/useProjectSelection.js'
import { roleSlug } from '../../shared/utils/roles.js'
import { hasSidebarPermission } from '../../layouts/Sidebar.jsx'
import ProjectStatus from './ProjectStatus.jsx'
import TeamWorkload from './TeamWorkload.jsx'
import { useFeedback } from '../../shared/components/Feedback.jsx'

function StatusBadge({ status }) {
  const s = (status || "").toLowerCase();
  let bg = "var(--color-slate-100)",
    color = "var(--color-slate-500)",
    label = status || "—";
  if (s === "rework") {
    bg = "var(--color-warning-bg)";
    color = "#92400E";
    label = "Rework";
  } else if (
    s === "in_review" ||
    s === "awaiting_review" ||
    s === "awaiting review"
  ) {
    bg = "var(--color-slate-200)";
    color = "var(--color-slate-700)";
    label = "Awaiting Review";
  } else if (s === "approved") {
    bg = "var(--color-success-bg)";
    color = "#166534";
    label = "Approved";
  } else if (s === "completed") {
    bg = "var(--color-success-bg)";
    color = "#166534";
    label = "Completed";
  } else if (s === "in_progress") {
    bg = "var(--color-primary-border)";
    color = "var(--color-primary-hover)";
    label = "In Progress";
  }
  return (
    <span
      className="inline-flex! items-center! justify-center! p-[3px_10px]! rounded-[14px]! text-[11px]! font-semibold! whitespace-nowrap!" style={{
  backgroundColor: bg,
  color
}}
    >
      {label}
    </span>
  );
}

function ImpactBadge({ text }) {
  if (!text || text === "—")
    return <span className="[color:var(--color-slate-400)]!">—</span>;
  const isBlock = text.toLowerCase().includes("block");
  const color = isBlock ? "var(--color-danger)" : "var(--color-indigo)";
  return (
    <span className="text-[12px]! font-medium!" style={{
  color
}}>{text}</span>
  );
}

function UrgencyBadge({ urgency }) {
  if (!urgency || urgency === "—")
    return <span className="[color:var(--color-slate-400)]!">—</span>;
  const lower = urgency.toLowerCase();
  let color = "var(--color-indigo)";
  if (lower === "high" || lower === "critical") color = "var(--color-danger)";
  else if (lower === "low") color = "var(--color-slate-500)";
  return (
    <span className="text-[12px]! font-medium!" style={{
  color
}}>
      {urgency}
    </span>
  );
}

export default function OverviewDashboard({ user }) {
  const { toast, feedback } = useFeedback()
  const navigate = useNavigate();
  const [addingTask, setAddingTask] = useState(false);
  const [reviewItem, setReviewItem] = useState(null);
  const { selectedProjectId } = useProjectSelection();
  const query = selectedProjectId && selectedProjectId !== 'all' ? `?project=${selectedProjectId}` : '';
  const { data, loading, error, reload } = useApiData(`/overview/${query}`, { projects: [], reviews: [], dependencies: [] });
  const routePrefix = roleSlug(user?.role) === 'admin' ? '/admin' : '/pm';
  const can = (module, action) => routePrefix === '/admin' || hasSidebarPermission(user?.permissions || {}, module, action);
  const userFirstName = user?.first_name || 'there';
  const formatDate = value => value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const pendingReviews = data.reviews.map(row => ({ id: row.id, workItem: row.title, project: row.project_name,
    submittedBy: row.submitted_by, sent: formatDate(row.submitted_at), status: row.status }));
  const dependencies = data.dependencies.map(row => ({ id: row.id, request: row.title, subLabel: row.project_name,
    requestedBy: row.submitted_by, requestedByRole: row.role || '',
    impact: row.dependency_type === 'mandatory' ? `Blocks ${row.task_name}` : row.task_name,
    urgency: row.priority, sent: formatDate(row.submitted_at) }));
  const taskProject = data.projects.find(project => project.id === selectedProjectId) || data.projects[0];
  return <main className="company-overview">{feedback}
    {reviewItem && <ReviewDrawer item={reviewItem} user={user} toast={toast} onClose={() => setReviewItem(null)} onUpdated={reload} />}
    {addingTask && <CreateTaskDialog key={taskProject?.id} project={taskProject} projects={data.projects} onClose={() => setAddingTask(false)} onCreated={reload} />}
          <div
            className="max-w-[1548px]! w-full! m-[0_auto]! p-[28px_32px_60px]!"
          >
            {/* Header */}
            <div
              className="flex! items-start! justify-between! mb-[24px]! flex-wrap! gap-[12px]!"
            >
              <div>
                <h1
                  className="text-[22px]! font-bold! [color:var(--color-slate-900)]! m-0! leading-[1.3]!"
                >
                  Hey, {userFirstName}
                </h1>
                <p
                  className="text-[13px]! [color:var(--color-slate-500)]! m-[4px_0_0]!"
                >
                  Here's what's happening with your project today.
                </p>
              </div>
              <div
                className="flex! items-center! gap-[10px]!"
              >
                {can('Tasks', 'Create') && (
                  <button
                    className="dash-assign-btn"
                    type="button"
                    onClick={() => setAddingTask(true)}
                  >
                    <span
                      className="text-[16px]! font-bold! leading-[1]!"
                    >
                      +
                    </span>{" "}
                    Assign Task
                  </button>
                )}
                {can('Projects', 'Create') && (
                  <button
                    className="dash-create-btn"
                    type="button"
                    onClick={() => navigate('/projects/new')}
                  >
                    <span
                      className="text-[16px]! font-bold! leading-[1]!"
                    >
                      +
                    </span>{" "}
                    Create Project
                  </button>
                )}
              </div>
            </div>

            {error && <p role="alert">{error} <button onClick={reload}>Retry</button></p>}
            {loading ? (
              <div
                className="flex! items-center! justify-center! p-[80px]!"
              >
                <div
                  className="w-[32px]! h-[32px]! [border:3px_solid_var(--color-slate-200)]! [border-top:3px_solid_var(--color-primary)]! rounded-[50%]! [animation:dashspin_0.8s_linear_infinite]!"
                />
              </div>
            ) : (
              <>
                {/* Charts Row */}
                <div
                  className={"overview-charts" + " " + "grid! grid-cols-[repeat(2,_minmax(0,_1fr))]! gap-[18px]! mb-[18px]!"}

                >
                  {can('ProjectPerformanceGraph', 'View') && <ProjectStatus projects={data.projects} />}
                  {can('TeamWorLoad', 'View') && <TeamWorkload projects={data.projects} />}
                </div>

                {/* Pending Reviews */}
                <div
                  className={"dash-card" + " " + "mb-[18px]! overflow-hidden!"}

                >
                  <div
                    className="flex! items-center! justify-between! p-[18px_24px_12px]! [border-bottom:1px_solid_var(--color-slate-100)]!"
                  >
                    <span
                      className="text-[15px]! font-semibold! [color:var(--color-slate-900)]!"
                    >
                      Pending Reviews
                    </span>
                    <button
                      className="dash-viewall"
                      type="button"
                      onClick={() => navigate(`${routePrefix}/approvals`)}
                    >
                      View all
                    </button>
                  </div>
                  <div
                    className={"overview-table-grid" + " " + "grid! grid-cols-[2.5fr_1.2fr_1.5fr_1.2fr_1.2fr_1fr]! p-[10px_24px]! [background-color:var(--color-slate-50)]! [border-bottom:1px_solid_var(--color-slate-100)]!"}

                  >
                    {[
                      "Work Item",
                      "Project",
                      "Submitted by",
                      "Sent",
                      "Status",
                      "Actions",
                    ].map((h) => (
                      <div
                        key={h}
                        className="text-[12px]! font-semibold! [color:var(--color-slate-500)]!"
                      >
                        {h}
                      </div>
                    ))}
                  </div>
                  {pendingReviews.length === 0 ? (
                    <div
                      className="p-[32px_24px]! text-center! [color:var(--color-slate-400)]! text-[13px]!"
                    >
                      No pending reviews
                    </div>
                  ) : (
                    pendingReviews.map((rev, idx) => (
                      <div
                        key={rev.id}
                        className={"dash-table-row overview-table-grid" + " " + "grid! grid-cols-[2.5fr_1.2fr_1.5fr_1.2fr_1.2fr_1fr]! p-[14px_24px]! items-center!"}
                        style={{
  borderBottom: idx < pendingReviews.length - 1 ? "1px solid var(--color-slate-100)" : "none"
}}
                      >
                        <div
                          className="text-[13px]! font-medium! [color:var(--color-slate-900)]!"
                        >
                          {rev.workItem}
                        </div>
                        <div
                          className="text-[13px]! [color:var(--color-slate-700)]!"
                        >
                          {rev.project}
                        </div>
                        <div
                          className="text-[13px]! [color:var(--color-slate-700)]!"
                        >
                          {rev.submittedBy}
                        </div>
                        <div
                          className="text-[13px]! [color:var(--color-slate-500)]!"
                        >
                          {rev.sent}
                        </div>
                        <div>
                          <StatusBadge status={rev.status} />
                        </div>
                        <div>
                          <button
                            className="dash-review-btn"
                            type="button"
                            onClick={() => setReviewItem(data.reviews.find(item => item.id === rev.id))}
                          >
                            Review
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Dependencies */}
                <div className={"dash-card" + " " + "overflow-hidden!"} >
                  <div
                    className="flex! items-center! justify-between! p-[18px_24px_12px]! [border-bottom:1px_solid_var(--color-slate-100)]!"
                  >
                    <span
                      className="text-[15px]! font-semibold! [color:var(--color-slate-900)]!"
                    >
                      Dependencies
                    </span>
                    <button
                      className="dash-viewall"
                      type="button"
                      onClick={() => navigate(`${routePrefix}/dependencies`)}
                    >
                      View all
                    </button>
                  </div>
                  <div
                    className={"overview-table-grid" + " " + "grid! grid-cols-[repeat(5,_1fr)]! [justify-content:space-evenly]! p-[10px_24px]! [background-color:var(--color-slate-50)]! [border-bottom:1px_solid_var(--color-slate-100)]!"}

                  >
                    {[
                      "Request",
                      "Requested by",
                      "Impact",
                      "Urgency",
                      "Sent",
                    ].map((h) => (
                      <div
                        key={h}
                        className="text-[12px]! font-semibold! [color:var(--color-slate-500)]!"
                      >
                        {h}
                      </div>
                    ))}
                  </div>
                  {dependencies.length === 0 ? (
                    <div
                      className="p-[32px_24px]! text-center! [color:var(--color-slate-400)]! text-[13px]!"
                    >
                      No pending dependencies
                    </div>
                  ) : (
                    dependencies.map((dep, idx) => (
                      <div
                        key={dep.id}
                        className={"dash-table-row overview-table-grid" + " " + "grid! grid-cols-[repeat(5,_1fr)]! [justify-content:space-evenly]! p-[14px_24px]! items-center!"}
                        style={{
  borderBottom: idx < dependencies.length - 1 ? "1px solid var(--color-slate-100)" : "none"
}}
                      >
                        <div>
                          <div
                            className="text-[13px]! font-medium! [color:var(--color-slate-900)]!"
                          >
                            {dep.request}
                          </div>
                          {dep.subLabel && (
                            <div
                              className="text-[11px]! [color:var(--color-slate-400)]! mt-[2px]!"
                            >
                              {dep.subLabel}
                            </div>
                          )}
                        </div>
                        <div>
                          <div
                            className="text-[13px]! font-medium! [color:var(--color-slate-900)]!"
                          >
                            {dep.requestedBy}
                          </div>
                          {dep.requestedByRole && (
                            <div
                              className="text-[11px]! [color:var(--color-slate-400)]! mt-[2px]!"
                            >
                              {dep.requestedByRole}
                            </div>
                          )}
                        </div>
                        <div>
                          <ImpactBadge text={dep.impact} />
                        </div>
                        <div>
                          <UrgencyBadge urgency={dep.urgency} />
                        </div>
                        <div
                          className="text-[12px]! [color:var(--color-slate-500)]!"
                        >
                          {dep.sent}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
  </main>;
}
