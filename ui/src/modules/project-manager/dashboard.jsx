import { useState } from 'react'
import ReviewDrawer from '../../features/approvals/ReviewDrawer.jsx'
import CreateTaskDialog from '../../features/tasks/components/CreateTaskDialog.jsx'
import { useNavigate } from 'react-router-dom'
import useApiData from '../../app/hooks/useApiData.js'
import { useProjectSelection } from '../../app/hooks/useProjectSelection.js'
import { roleSlug } from '../../utils/roles.js'
import { hasSidebarPermission } from '../../layouts/sidebarNavigation.js'
import ProjectStatus from './components/ProjectStatus.jsx'
import TeamWorkload from './components/TeamWorkload.jsx'
import './dashboard.css'

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
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3px 10px",
        borderRadius: "14px",
        fontSize: "11px",
        fontWeight: "600",
        backgroundColor: bg,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function ImpactBadge({ text }) {
  if (!text || text === "—")
    return <span style={{ color: "var(--color-slate-400)" }}>—</span>;
  const isBlock = text.toLowerCase().includes("block");
  const color = isBlock ? "var(--color-danger)" : "var(--color-indigo)";
  return (
    <span style={{ color, fontSize: "12px", fontWeight: "500" }}>{text}</span>
  );
}

function UrgencyBadge({ urgency }) {
  if (!urgency || urgency === "—")
    return <span style={{ color: "var(--color-slate-400)" }}>—</span>;
  const lower = urgency.toLowerCase();
  let color = "var(--color-indigo)";
  if (lower === "high" || lower === "critical") color = "var(--color-danger)";
  else if (lower === "low") color = "var(--color-slate-500)";
  return (
    <span style={{ color, fontSize: "12px", fontWeight: "500" }}>
      {urgency}
    </span>
  );
}

export default function ProjectManagerDashboard({ user }) {
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
  return <main className="company-overview">
    {reviewItem && <ReviewDrawer item={reviewItem} user={user} onClose={() => setReviewItem(null)} onUpdated={reload} />}
    {addingTask && <CreateTaskDialog key={taskProject?.id} project={taskProject} projects={data.projects} onClose={() => setAddingTask(false)} onCreated={reload} />}
          <div
            style={{
              maxWidth: "1548px",
              width: "100%",
              margin: "0 auto",
              padding: "28px 32px 60px",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: "24px",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <h1
                  style={{
                    fontSize: "22px",
                    fontWeight: "700",
                    color: "var(--color-slate-900)",
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  Hey, {userFirstName}
                </h1>
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--color-slate-500)",
                    margin: "4px 0 0",
                  }}
                >
                  Here's what's happening with your project today.
                </p>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                {can('Tasks', 'Create') && (
                  <button
                    className="dash-assign-btn"
                    type="button"
                    onClick={() => setAddingTask(true)}
                  >
                    <span
                      style={{
                        fontSize: "16px",
                        fontWeight: "700",
                        lineHeight: 1,
                      }}
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
                      style={{
                        fontSize: "16px",
                        fontWeight: "700",
                        lineHeight: 1,
                      }}
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
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "80px",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    border: "3px solid var(--color-slate-200)",
                    borderTop: "3px solid var(--color-primary)",
                    borderRadius: "50%",
                    animation: "dashspin 0.8s linear infinite",
                  }}
                />
              </div>
            ) : (
              <>
                {/* Charts Row */}
                <div
                  className="overview-charts"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: "18px",
                    marginBottom: "18px",
                  }}
                >
                  <ProjectStatus projects={data.projects} />
                  {can('TeamWorLoad', 'View') && <TeamWorkload projects={data.projects} />}
                </div>

                {/* Pending Reviews */}
                <div
                  className="dash-card"
                  style={{ marginBottom: "18px", overflow: "hidden" }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "18px 24px 12px",
                      borderBottom: "1px solid var(--color-slate-100)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "15px",
                        fontWeight: "600",
                        color: "var(--color-slate-900)",
                      }}
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
                    className="overview-table-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2.5fr 1.2fr 1.5fr 1.2fr 1.2fr 1fr",
                      padding: "10px 24px",
                      backgroundColor: "var(--color-slate-50)",
                      borderBottom: "1px solid var(--color-slate-100)",
                    }}
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
                        style={{
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "var(--color-slate-500)",
                        }}
                      >
                        {h}
                      </div>
                    ))}
                  </div>
                  {pendingReviews.length === 0 ? (
                    <div
                      style={{
                        padding: "32px 24px",
                        textAlign: "center",
                        color: "var(--color-slate-400)",
                        fontSize: "13px",
                      }}
                    >
                      No pending reviews
                    </div>
                  ) : (
                    pendingReviews.map((rev, idx) => (
                      <div
                        key={rev.id}
                        className="dash-table-row overview-table-grid"
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "2.5fr 1.2fr 1.5fr 1.2fr 1.2fr 1fr",
                          padding: "14px 24px",
                          borderBottom:
                            idx < pendingReviews.length - 1
                              ? "1px solid var(--color-slate-100)"
                              : "none",
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: "500",
                            color: "var(--color-slate-900)",
                          }}
                        >
                          {rev.workItem}
                        </div>
                        <div
                          style={{
                            fontSize: "13px",
                            color: "var(--color-slate-700)",
                          }}
                        >
                          {rev.project}
                        </div>
                        <div
                          style={{
                            fontSize: "13px",
                            color: "var(--color-slate-700)",
                          }}
                        >
                          {rev.submittedBy}
                        </div>
                        <div
                          style={{
                            fontSize: "13px",
                            color: "var(--color-slate-500)",
                          }}
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
                <div className="dash-card" style={{ overflow: "hidden" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "18px 24px 12px",
                      borderBottom: "1px solid var(--color-slate-100)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "15px",
                        fontWeight: "600",
                        color: "var(--color-slate-900)",
                      }}
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
                    className="overview-table-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(5, 1fr)",
                      justifyContent: "space-evenly",
                      padding: "10px 24px",
                      backgroundColor: "var(--color-slate-50)",
                      borderBottom: "1px solid var(--color-slate-100)",
                    }}
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
                        style={{
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "var(--color-slate-500)",
                        }}
                      >
                        {h}
                      </div>
                    ))}
                  </div>
                  {dependencies.length === 0 ? (
                    <div
                      style={{
                        padding: "32px 24px",
                        textAlign: "center",
                        color: "var(--color-slate-400)",
                        fontSize: "13px",
                      }}
                    >
                      No pending dependencies
                    </div>
                  ) : (
                    dependencies.map((dep, idx) => (
                      <div
                        key={dep.id}
                        className="dash-table-row overview-table-grid"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(5, 1fr)",
                          justifyContent: "space-evenly",
                          padding: "14px 24px",
                          borderBottom:
                            idx < dependencies.length - 1
                              ? "1px solid var(--color-slate-100)"
                              : "none",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: "13px",
                              fontWeight: "500",
                              color: "var(--color-slate-900)",
                            }}
                          >
                            {dep.request}
                          </div>
                          {dep.subLabel && (
                            <div
                              style={{
                                fontSize: "11px",
                                color: "var(--color-slate-400)",
                                marginTop: "2px",
                              }}
                            >
                              {dep.subLabel}
                            </div>
                          )}
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: "13px",
                              fontWeight: "500",
                              color: "var(--color-slate-900)",
                            }}
                          >
                            {dep.requestedBy}
                          </div>
                          {dep.requestedByRole && (
                            <div
                              style={{
                                fontSize: "11px",
                                color: "var(--color-slate-400)",
                                marginTop: "2px",
                              }}
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
                          style={{
                            fontSize: "12px",
                            color: "var(--color-slate-500)",
                          }}
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
