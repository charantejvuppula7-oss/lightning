import { useState, useEffect, useCallback, useContext } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { FilterSelect, SearchBar } from '../../components/common/SearchControls.jsx';
import { useFeedback } from '../../components/common/Feedback.jsx';
import { apiList, apiRequest, errorMessage } from '../../services/api/apiClient.js';
import { ProjectSelectionContext } from '../projects/projectSelectionContext.js';
import { hasSidebarPermission } from '../../layouts/sidebarNavigation.js';
import { roleSlug as getRoleSlug } from '../../utils/roles.js';
import UserEditor from './UserEditor.jsx';

const statusColor = {
  open: { label: "To Do", bg: "var(--color-slate-100)", color: "var(--color-slate-600)" },
  in_progress: { label: "In Progress", bg: "var(--color-primary-subtle)", color: "var(--color-primary)" },
  in_review: { label: "In Review", bg: "var(--color-warning-bg)", color: "var(--color-warning-dark)" },
  completed: { label: "Completed", bg: "#ecfdf5", color: "#059669" },
  paused: { label: "Paused", bg: "var(--color-danger-bg)", color: "var(--color-danger-dark)" },
};

export default function UsersPage({ user: currentPM }) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { selectedProjectId } = useContext(ProjectSelectionContext);
  const { toast, feedback } = useFeedback();
  const [users, setUsers] = useState([]);
  const [tasksByUser, setTasksByUser] = useState({});
  const [dependenciesByUser, setDependenciesByUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const admin = ['Administrator', 'Admin'].includes(currentPM.role);
  const canCreateUser = admin || hasSidebarPermission(currentPM.permissions, 'User Management', 'Create');
  const canEditUser = admin || hasSidebarPermission(currentPM.permissions, 'User Management', 'Edit');
  const canDeleteUser = admin || hasSidebarPermission(currentPM.permissions, 'User Management', 'Delete');
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || location.state?.searchUser || '');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [requestedPage, setCurrentPage] = useState(1);
  const [today] = useState(() => Date.now());
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const loadUsers = useCallback(async ({ signal } = {}) => {
    setLoading(true);
    try { setUsers(await apiList(`/users/${selectedProjectId && selectedProjectId !== 'all' ? `?project=${selectedProjectId}` : ''}`, { signal })); }
    catch (error) { if (!signal?.aborted) { toast.error(errorMessage(error)); setUsers([]); } }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [selectedProjectId, toast]);
  // Synchronize the roster with the selected project.
  useEffect(() => {
    const controller = new AbortController();
    // Starting an external request also updates its loading indicator.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUsers({ signal: controller.signal });
    return () => controller.abort();
  }, [loadUsers]);
  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Deactivate ${name}? This account will no longer be able to sign in.`)) return;
    try { await apiRequest(`/users/${id}/`, { method: 'DELETE' }); await loadUsers(); toast.success('Account deactivated.'); }
    catch (error) { toast.error(errorMessage(error)); }
  };
  const handleViewUser = async user => {
    setSelectedUserId(user.id); setIsDetailModalOpen(true); setLoadingTasks(true);
    const projectFilter = selectedProjectId ? `&project=${selectedProjectId}` : '';
    const results = await Promise.allSettled([
      apiList(`/tasks/?assigned_to=${user.id}${projectFilter}`),
      apiList(`/dependencies/?assigned_to=${user.id}${projectFilter}`),
    ]);
    setTasksByUser(previous => ({ ...previous, [user.id]: results[0].status === 'fulfilled' ? results[0].value : [] }));
    setDependenciesByUser(previous => ({ ...previous, [user.id]: results[1].status === 'fulfilled' ? results[1].value : [] }));
    if (results.some(result => result.status === 'rejected')) toast.error('Some assignments could not be loaded with your current permissions.');
    setLoadingTasks(false);
  };
  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedRole("");
    setSelectedDept("");
    setCurrentPage(1);
  };

  const getInitials = (user) => {
    const first = user.first_name?.[0] || "";
    const last = user.last_name?.[0] || "";
    return (first + last).toUpperCase() || "?";
  };

  // Filter logic
  const filteredUsers = users.filter((user) => {
    const q = (searchQuery || "").trim().toLowerCase();
    const userRole = (user.role || "").toLowerCase();
    const nameMatch = q
      ? `${user.first_name || ""} ${user.last_name || ""}`.toLowerCase().includes(q) ||
      (user.user_name || "").toLowerCase().includes(q) ||
      (user.email || "").toLowerCase().includes(q) ||
      userRole.includes(q) ||
      (user.department || "").toLowerCase().includes(q)
      : true;
    const roleMatch = selectedRole
      ? userRole === selectedRole.toLowerCase() ||
        getRoleSlug(userRole) === getRoleSlug(selectedRole)
      : true;
    const deptMatch = selectedDept ? (user.department) === selectedDept : true;
    return nameMatch && roleMatch && deptMatch;
  });

  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE) || 1;
  const currentPage = Math.min(requestedPage, totalPages);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );
  const startItem = filteredUsers.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, filteredUsers.length);



  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-slate-50)",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <p style={{ color: "var(--color-slate-500)", fontSize: 15 }}>Loading…</p>
      </div>
    );
  }

  const selectedUserObj = users.find((u) => u.id === selectedUserId);
  const userTasks = selectedUserId ? tasksByUser[selectedUserId] || [] : [];
  const userDeps = selectedUserId ? dependenciesByUser[selectedUserId] || [] : [];

  return (
    <div style={{ width: "100%", minWidth: 0 }}>
      {feedback}
      {editingUser && <UserEditor key={editingUser.id || "new"} initial={editingUser} projectId={selectedProjectId} onClose={() => setEditingUser(null)} onSaved={() => { setEditingUser(null); loadUsers(); }} />}
      <style>{`
        * { box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background-color: var(--color-slate-50); }
        .roles-select:focus, .depts-select:focus {
          border-color: var(--color-primary-light) !important;
        }
        .action-icon-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--color-slate-500);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border-radius: 6px;
          transition: all 0.15s;
        }
        .action-icon-btn:hover {
          background-color: var(--color-slate-100);
        }
        .action-icon-btn.view:hover { color: var(--color-primary); }
        .action-icon-btn.edit:hover { color: #059669; }
        .action-icon-btn.delete:hover { color: var(--color-danger-dark); background-color: var(--color-danger-border); }
        .table-row-hover:hover {
          background-color: var(--color-slate-50);
        }
      `}</style>

      <div style={{ width: "100%", minWidth: 0 }}>
        <div style={{ padding: "24px 32px", overflowY: "auto", flex: 1 }}>
          {/* Title Header Row */}
          <div style={styles.pageHeaderRow}>
            <div>
              <h1 style={styles.pageTitle}>Team Members</h1>
              <p style={styles.pageSubtitle}>Members assigned to the selected project.</p>
            </div>
            {canCreateUser && (
              <button
                onClick={() => setEditingUser({})}
                style={styles.createUserBtn}
              >
                + Create User
              </button>
            )}
          </div>

          {/* Filter and Table Container */}
          <div style={styles.cardContainer}>
            {/* Filter Bar */}
            <div style={styles.filterBar}>
              <SearchBar
                placeholder="Search user"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                wrapperStyle={styles.searchWrapper}
                iconStyle={styles.searchIcon}
                inputStyle={styles.searchInput}
              />

              <div style={styles.dropdownsWrapper}>
                <FilterSelect
                  value={selectedRole}
                  onChange={(e) => {
                    setSelectedRole(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="roles-select"
                  style={styles.filterSelect}
                >
                  <option value="">Roles</option>
                  <option value="admin">Admin</option>
                  <option value="pm">Project Manager</option>
                  <option value="developer">Developer</option>
                </FilterSelect>

                <FilterSelect
                  value={selectedDept}
                  onChange={(e) => {
                    setSelectedDept(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="depts-select"
                  style={styles.filterSelect}
                >
                  <option value="">Departments</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Firmware">Firmware</option>
                  <option value="Software">Software</option>
                  <option value="Mechanical">Mechanical</option>
                  <option value="Testing">Testing</option>
                  <option value="Production">Production</option>
                  <option value="Quality Assurance">Quality Assurance</option>
                  <option value="Documentation">Documentation</option>
                  <option value="Management">Management</option>
                </FilterSelect>

                <button onClick={handleClearFilters} style={styles.clearBtn}>
                  Clear
                </button>
              </div>
            </div>

            {/* Table */}
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Team Member</th>
                    <th style={styles.th}>Email ID</th>
                    <th style={styles.th}>Roles</th>
                    <th style={styles.th}>Department</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={styles.emptyTd}>
                        No team members found matching active filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user) => {
                      const userRoleStr = (user.role || "developer").toLowerCase();
                      const isPm = userRoleStr === "pm" || userRoleStr === "project manager";
                      const isAdmin = userRoleStr === "admin" || userRoleStr === "administrator";

                      // Let's make dynamic badge color based on role
                      let badgeBg = "var(--color-slate-100)";
                      let badgeColor = "var(--color-slate-600)";
                      let roleLabel = user.role || "Developer";

                      if (isPm) {
                        badgeBg = "#e0e7ff";
                        badgeColor = "#3730a3";
                        roleLabel = "PM";
                      } else if (isAdmin) {
                        badgeBg = "#d9f99d";
                        badgeColor = "#3f6212";
                        roleLabel = "Admin";
                      } else if (userRoleStr === "developer") {
                        badgeBg = "var(--color-primary-border)";
                        badgeColor = "var(--color-primary-hover)";
                        roleLabel = "Developer";
                      }

                      return (
                        <tr key={user.id} className="table-row-hover" style={styles.tr}>
                          <td style={styles.td}>
                            <div style={styles.memberCell}>
                              <div
                                style={styles.avatarCircle}
                                title={
                                  user.user_name ||
                                  user.username ||
                                  user.user_name ||
                                  `${user.first_name || ""} ${user.last_name || ""}`.trim()
                                }
                              >
                                {getInitials(user)}
                              </div>
                              <span style={styles.memberName}>
                                {user.first_name} {user.last_name}
                              </span>
                            </div>
                          </td>
                          <td style={styles.td}>{user.email}</td>
                          <td style={styles.td}>
                            <span style={{ ...styles.roleBadge, backgroundColor: badgeBg, color: badgeColor }}>
                              {roleLabel}
                            </span>
                          </td>
                          <td style={styles.td}>{user.department || "General"}</td>
                          <td style={{ ...styles.td, textAlign: "right" }}>
                            <div style={styles.actionsCell}>
                              <button
                                className="action-icon-btn view"
                                title="View details & tasks"
                                onClick={() => handleViewUser(user)}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>visibility</span>
                              </button>
                              {canEditUser && (
                                <button
                                  className="action-icon-btn edit"
                                  title="Edit user details"
                                  onClick={() => setEditingUser(user)}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>edit</span>
                                </button>
                              )}
                              {canDeleteUser && (
                                <button
                                  className="action-icon-btn delete"
                                  title="Delete user"
                                  onClick={() => handleDeleteUser(user.id, `${user.first_name} ${user.last_name}`)}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>delete</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div style={styles.paginationRow}>
              <span style={styles.paginationInfo}>
                Showing {startItem} to {endItem} of {filteredUsers.length} users
              </span>

              <div style={styles.paginationBtns}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  style={{
                    ...styles.pageBtn,
                    color: currentPage === 1 ? "var(--color-slate-300)" : "var(--color-slate-600)",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  }}
                >
                  &lt;
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    style={{
                      ...styles.pageBtn,
                      backgroundColor: currentPage === p ? "var(--color-primary)" : "var(--color-white)",
                      color: currentPage === p ? "var(--color-white)" : "var(--color-slate-600)",
                      borderColor: currentPage === p ? "var(--color-primary)" : "var(--color-slate-200)",
                    }}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  style={{
                    ...styles.pageBtn,
                    color: currentPage === totalPages ? "var(--color-slate-300)" : "var(--color-slate-600)",
                    cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  }}
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Members Profile Right-Side Panel */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .profile-panel {
          animation: slideInRight 0.28s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          width: 440px !important;
          max-width: 100vw !important;
        }
        @media (max-width: 768px) {
          .profile-panel {
            width: min(440px, 92vw) !important;
          }
        }
        @media (max-width: 480px) {
          .profile-panel {
            width: 100vw !important;
            border-radius: 0 !important;
          }
          .profile-row {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
          }
          .panel-avatar-row {
            padding: 14px 16px !important;
          }
          .panel-body-content {
            padding: 14px 16px !important;
          }
        }
        .profile-panel-body {
          scrollbar-width: thin;
          scrollbar-color: var(--color-slate-300) transparent;
        }
        .profile-panel-body::-webkit-scrollbar {
          width: 6px;
        }
        .profile-panel-body::-webkit-scrollbar-track {
          background: transparent;
        }
        .profile-panel-body::-webkit-scrollbar-thumb {
          background: var(--color-slate-300);
          border-radius: 9999px;
        }
        .profile-panel-body::-webkit-scrollbar-thumb:hover {
          background: var(--color-slate-400);
        }
        .profile-section-divider {
          border: none;
          border-top: 1px solid var(--color-slate-200);
          margin: 0;
        }
        .profile-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px 24px;
        }
        .profile-field-label {
          font-size: 11.5px;
          color: var(--color-slate-400);
          font-weight: 500;
          margin-bottom: 3px;
        }
        .profile-field-value {
          font-size: 13.5px;
          color: var(--color-slate-800);
          font-weight: 500;
        }
        .profile-project-chip {
          display: inline-block;
          padding: 5px 13px;
          border: 1px solid var(--color-slate-300);
          border-radius: 20px;
          font-size: 13px;
          color: var(--color-slate-700);
          font-weight: 500;
          background: var(--color-white);
        }
        .profile-security-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
        }
        .profile-security-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1.5px solid var(--color-slate-300);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
      `}</style>

      {isDetailModalOpen && selectedUserObj && (
        <>
          {/* Backdrop */}
          <div
            style={styles.panelBackdrop}
            onClick={() => setIsDetailModalOpen(false)}
          />

          {/* Panel */}
          <div className="profile-panel" style={styles.profilePanel}>
            {/* Panel Title Bar */}
            <div style={styles.panelTitleBar}>
              <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--color-slate-600)" }}>
                Members Profile
              </span>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                style={styles.panelCloseBtn}
                title="Close"
              >
                ×
              </button>
            </div>

            {/* Scrollable body */}
            <div style={styles.panelBody} className="profile-panel-body">
              {/* ── Avatar + Name Row ── */}
              <div style={styles.panelAvatarRow} className="panel-avatar-row">
                <div style={styles.panelAvatar}>
                  {getInitials(selectedUserObj)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--color-slate-900)" }}>
                    {selectedUserObj.first_name} {selectedUserObj.last_name}
                  </div>
                  <div style={{ fontSize: "12.5px", color: "var(--color-slate-500)", marginTop: "2px" }}>
                    {selectedUserObj.designation || selectedUserObj.role || "—"}
                    {selectedUserObj.department ? ` • ${selectedUserObj.department}` : ""}
                  </div>
                </div>
                {canEditUser && (
                  <button
                    title="Edit user"
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      setEditingUser(selectedUserObj);
                    }}
                    style={styles.panelEditBtn}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>edit</span>
                  </button>
                )}
              </div>

              <hr className="profile-section-divider" />

              {/* ── Contact ── */}
              <div style={styles.panelSection} className="panel-body-content">
                <div style={styles.panelSectionTitle}>Contact</div>
                <hr className="profile-section-divider" style={{ marginBottom: "14px" }} />
                <div className="profile-row">
                  <div>
                    <div className="profile-field-label">Work Email</div>
                    <div className="profile-field-value" style={{ wordBreak: "break-all" }}>
                      {selectedUserObj.email || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="profile-field-label">Alternative Email</div>
                    <div className="profile-field-value" style={{ wordBreak: "break-all" }}>
                      {selectedUserObj.alternate_email || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="profile-field-label">Phone</div>
                    <div className="profile-field-value">
                      {selectedUserObj.phone_number || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="profile-field-label">Location</div>
                    <div className="profile-field-value">
                      {selectedUserObj.location || "—"}
                    </div>
                  </div>
                </div>
              </div>

              <hr className="profile-section-divider" />

              {/* ── Roles & Permission ── */}
              <div style={styles.panelSection} className="panel-body-content">
                <div style={styles.panelSectionTitle}>Roles &amp; Permission</div>
                <hr className="profile-section-divider" style={{ marginBottom: "14px" }} />
                <div className="profile-row">
                  <div>
                    <div className="profile-field-label">Workspace and Role</div>
                    <div className="profile-field-value" style={{ textTransform: "capitalize" }}>
                      {selectedUserObj.role === "pm" ? "Project Manager" : selectedUserObj.role || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="profile-field-label">Account Status</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "2px" }}>
                      <span style={{
                        width: "7px", height: "7px", borderRadius: "50%",
                        backgroundColor: selectedUserObj.Active === false || selectedUserObj.account_status === "inactive" ? "var(--color-danger)" : "var(--color-success-alt)",
                        display: "inline-block",
                        flexShrink: 0,
                      }} />
                      <span className="profile-field-value">
                        {selectedUserObj.Active === false || selectedUserObj.account_status === "inactive" ? "Inactive" : "Active"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="profile-field-label">Department</div>
                    <div className="profile-field-value">{selectedUserObj.department || "—"}</div>
                  </div>
                  <div>
                    <div className="profile-field-label">Designation</div>
                    <div className="profile-field-value">{selectedUserObj.designation || "—"}</div>
                  </div>
                  <div>
                    <div className="profile-field-label">Employment Type</div>
                    <div className="profile-field-value">{selectedUserObj.employment_type || "—"}</div>
                  </div>
                  <div>
                    <div className="profile-field-label">Joined</div>
                    <div className="profile-field-value">
                      {selectedUserObj.date_of_joining
                        ? (() => {
                          const d = new Date(selectedUserObj.date_of_joining);
                          const diff = Math.floor((today - d) / (1000 * 60 * 60 * 24 * 30));
                          return (
                            <>
                              <div>{d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
                              <div style={{ fontSize: "11px", color: "var(--color-slate-400)" }}>
                                {diff < 1 ? "< 1 mo." : `${diff} mo.`}
                              </div>
                            </>
                          );
                        })()
                        : "—"}
                    </div>
                  </div>
                </div>
              </div>

              <hr className="profile-section-divider" />

              {/* ── Reports To ── */}
              <div style={styles.panelSection} className="panel-body-content">
                <div style={styles.panelSectionTitle}>Reports to</div>
                <hr className="profile-section-divider" style={{ marginBottom: "14px" }} />
                {selectedUserObj.manager_name ? (
                  <div style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    background: "var(--color-slate-100)", borderRadius: "8px", padding: "10px 14px",
                  }}>
                    <div style={{
                      width: "36px", height: "36px", borderRadius: "50%",
                      backgroundColor: "var(--color-primary)", color: "var(--color-white)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: "700", fontSize: "13px", flexShrink: 0,
                    }}>
                      {selectedUserObj.manager_name.split(" ").map(word => word[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontSize: "13.5px", fontWeight: "600", color: "var(--color-slate-800)" }}>
                        {selectedUserObj.manager_name}
                      </div>
                      <div style={{ fontSize: "11.5px", color: "var(--color-slate-500)" }}>Project Manager</div>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: "13px", color: "var(--color-slate-400)" }}>No manager assigned.</p>
                )}
              </div>

              <hr className="profile-section-divider" />

              {/* ── Projects ── */}
              <div style={styles.panelSection} className="panel-body-content">
                <div style={styles.panelSectionTitle}>Projects</div>
                <hr className="profile-section-divider" style={{ marginBottom: "14px" }} />
                {loadingTasks ? (
                  <p style={{ fontSize: "13px", color: "var(--color-slate-400)" }}>Loading…</p>
                ) : (
                  (() => {
                    // Collect unique projects from tasks
                    const projectSet = new Map();
                    (userTasks || []).forEach(t => {
                      if (t.project_name) projectSet.set(t.Project_Id || t.project_name, t.project_name);
                    });
                    // Also use Projects field from user object if available
                    const userProjects = selectedUserObj.Projects || selectedUserObj.project_ids || [];
                    const projectChips = Array.from(projectSet.values());
                    if (projectChips.length === 0 && userProjects.length === 0) {
                      return <p style={{ fontSize: "13px", color: "var(--color-slate-400)" }}>No projects assigned.</p>;
                    }
                    return (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {projectChips.map((name, i) => (
                          <span key={i} className="profile-project-chip">{name}</span>
                        ))}
                        {projectChips.length === 0 && userProjects.map((p, i) => (
                          <span key={i} className="profile-project-chip">
                            {typeof p === "object" ? (p.project_name || p.name || p.id) : p}
                          </span>
                        ))}
                      </div>
                    );
                  })()
                )}
              </div>

              <hr className="profile-section-divider" />

              {/* ── Security ── */}
              <div style={styles.panelSection} className="panel-body-content">
                <div style={styles.panelSectionTitle}>Security</div>
                <hr className="profile-section-divider" style={{ marginBottom: "6px" }} />

                <div className="profile-security-row">
                  <div className="profile-security-icon">
                    <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "var(--color-success-alt)" }}>schedule</span>
                  </div>
                  <div>
                    <div style={{ fontSize: "13.5px", fontWeight: "600", color: "var(--color-slate-800)" }}>Password</div>
                    <div style={{ fontSize: "11.5px", color: "var(--color-slate-500)" }}>
                      {selectedUserObj.Password_Changed_At
                        ? `Changed ${Math.floor((today - new Date(selectedUserObj.Password_Changed_At)) / 86400000)} days ago`
                        : "Last changed unknown"}
                    </div>
                  </div>
                </div>

                <div className="profile-security-row">
                  <div className="profile-security-icon">
                    <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "var(--color-primary)" }}>lock</span>
                  </div>
                  <div>
                    <div style={{ fontSize: "13.5px", fontWeight: "600", color: "var(--color-slate-800)" }}>Last sign-in</div>
                    <div style={{ fontSize: "11.5px", color: "var(--color-slate-500)" }}>
                      {selectedUserObj.Last_Login
                        ? `${new Date(selectedUserObj.Last_Login).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                        : "No sign-in recorded"}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Tasks (collapsible section) ── */}
              {userDeps.length > 0 && <section style={{ marginBottom: 20 }}>
                <h3 style={styles.panelSectionTitle}>Assigned Dependencies ({userDeps.length})</h3>
                {userDeps.map(dependency => <p key={dependency.id} style={{ fontSize: 13, padding: 8 }}>{dependency.description} · {dependency.status.replaceAll('_', ' ')}</p>)}
              </section>}
              {userTasks.length > 0 && (
                <>
                  <hr className="profile-section-divider" />
                  <div style={styles.panelSection} className="panel-body-content">
                    <div style={styles.panelSectionTitle}>Assigned Tasks ({userTasks.length})</div>
                    <hr className="profile-section-divider" style={{ marginBottom: "10px" }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {userTasks.slice(0, 5).map((task) => {
                        const st = statusColor[task.status] || statusColor.open;
                        return (
                          <div key={task.id} style={{
                            border: "1px solid var(--color-slate-200)", borderRadius: "8px",
                            padding: "12px 14px", backgroundColor: "#fafbff",
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--color-slate-800)" }}>
                                {task.Task_Name || "Unnamed Task"}
                              </span>
                              <span style={{ ...styles.badge, background: st.bg, color: st.color, whiteSpace: "nowrap" }}>
                                {st.label}
                              </span>
                            </div>
                            <div style={{ fontSize: "11.5px", color: "var(--color-slate-400)", marginTop: "5px" }}>
                              {task.project_name && `📁 ${task.project_name}`}
                              {task.Due_Date && ` · 📅 ${new Date(task.Due_Date).toLocaleDateString()}`}
                            </div>
                          </div>
                        );
                      })}
                      {userTasks.length > 5 && (
                        <p style={{ fontSize: "12px", color: "var(--color-slate-400)", textAlign: "center" }}>
                          +{userTasks.length - 5} more tasks
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  layoutWrapper: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: "var(--color-slate-50)",
    fontFamily: "'Inter', sans-serif",
  },
  mainContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    height: "100vh",
    backgroundColor: "var(--color-slate-50)",
  },
  topNavbar: {
    height: "50px",
    minHeight: "50px",
    backgroundColor: "var(--color-white)",
    borderBottom: "1px solid var(--color-slate-200)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 32px",
    position: "sticky",
    top: 0,
    zIndex: 40,
    boxSizing: "border-box",
    flexShrink: 0,
  },
  projectDropdownBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    height: "34px",
    backgroundColor: "var(--color-white)",
    border: "1px solid var(--color-slate-200)",
    borderRadius: "8px",
    padding: "0 12px",
    fontSize: "14px",
    fontWeight: "600",
    color: "var(--color-slate-900)",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
    boxSizing: "border-box",
  },
  projectDropdownText: {
    fontSize: "14px",
    fontWeight: "600",
    color: "var(--color-slate-900)",
  },
  projectDropdownMenu: {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: 0,
    minWidth: "200px",
    backgroundColor: "var(--color-white)",
    border: "1px solid var(--color-slate-200)",
    borderRadius: "8px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
    zIndex: 100,
    overflow: "hidden",
    padding: "4px 0",
  },
  projectDropdownItem: {
    padding: "9px 14px",
    fontSize: "13px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    transition: "background-color 0.12s ease",
  },
  navbarSearchWrapper: {
    position: "relative",
    width: "280px",
  },
  navbarSearchIcon: {
    position: "absolute",
    left: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "var(--color-slate-400)",
    fontSize: "18px",
  },
  navbarSearchInput: {
    width: "100%",
    height: "34px",
    paddingLeft: "34px",
    paddingRight: "12px",
    backgroundColor: "var(--color-white)",
    border: "1px solid var(--color-slate-200)",
    borderRadius: "8px",
    fontSize: "13px",
    outline: "none",
    color: "var(--color-slate-900)",
    boxSizing: "border-box",
  },
  navbarNotifWrapper: {
    position: "relative",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "34px",
    height: "34px",
    borderRadius: "8px",
    border: "1px solid var(--color-slate-200)",
    backgroundColor: "var(--color-white)",
  },
  navbarNotifBadge: {
    position: "absolute",
    top: "6px",
    right: "6px",
    width: "7px",
    height: "7px",
    backgroundColor: "var(--color-danger)",
    borderRadius: "50%",
  },
  navbarAvatarCircle: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: "var(--color-role-pm)",
    color: "var(--color-white)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "700",
    cursor: "pointer",
    userSelect: "none",
  },
  pageHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
    marginTop: "16px",
  },
  pageTitle: {
    fontSize: "26px",
    fontWeight: "700",
    color: "var(--color-slate-900)",
    margin: 0,
  },
  pageSubtitle: {
    fontSize: "14px",
    color: "var(--color-slate-500)",
    marginTop: "6px",
    margin: 0,
  },
  createUserBtn: {
    backgroundColor: "var(--color-primary)",
    color: "var(--color-white)",
    border: "none",
    borderRadius: "8px",
    padding: "10px 18px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  cardContainer: {
    backgroundColor: "var(--color-white)",
    borderRadius: "14px",
    border: "1px solid var(--color-slate-200)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.01)",
    padding: "24px",
    marginBottom: "32px",
  },
  filterBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    gap: "16px",
    flexWrap: "wrap",
  },
  searchWrapper: {
    position: "relative",
    width: "400px",
  },
  searchIcon: {
    position: "absolute",
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "var(--color-slate-400)",
    fontSize: "20px",
  },
  searchInput: {
    width: "100%",
    padding: "10px 14px 10px 42px",
    border: "1px solid var(--color-slate-300)",
    borderRadius: "8px",
    fontSize: "14px",
    color: "var(--color-slate-800)",
    outline: "none",
    backgroundColor: "var(--color-white)",
  },
  dropdownsWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  filterSelect: {
    padding: "10px 32px 10px 16px",
    border: "1px solid var(--color-slate-300)",
    borderRadius: "8px",
    fontSize: "14px",
    backgroundColor: "var(--color-white)",
    color: "var(--color-slate-600)",
    cursor: "pointer",
    outline: "none",
    minWidth: "160px",
  },
  clearBtn: {
    background: "none",
    border: "none",
    color: "var(--color-slate-600)",
    fontWeight: "500",
    cursor: "pointer",
    fontSize: "14px",
    padding: "6px 12px",
    borderRadius: "6px",
    transition: "background-color 0.15s",
  },
  tableWrapper: {
    border: "1px solid var(--color-slate-200)",
    borderRadius: "10px",
    overflow: "hidden",
    backgroundColor: "var(--color-white)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
    textAlign: "left",
  },
  th: {
    padding: "14px 20px",
    backgroundColor: "var(--color-primary-subtle)",
    color: "var(--color-primary-hover)",
    fontWeight: "600",
    fontSize: "13px",
    borderBottom: "1.5px solid var(--color-primary-border)",
  },
  tr: {
    borderBottom: "1px solid var(--color-slate-100)",
    transition: "background-color 0.15s ease",
  },
  td: {
    padding: "14px 20px",
    color: "var(--color-slate-600)",
    verticalAlign: "middle",
  },
  memberCell: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  avatarCircle: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    backgroundColor: "#1e3a8a",
    color: "var(--color-white)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "13px",
    cursor: "pointer",
    userSelect: "none",
  },
  memberName: {
    fontWeight: "600",
    color: "var(--color-slate-800)",
  },
  roleBadge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "600",
  },
  actionsCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "8px",
  },
  emptyTd: {
    padding: "32px",
    textAlign: "center",
    color: "var(--color-slate-400)",
    fontSize: "15px",
  },
  paginationRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "20px",
  },
  paginationInfo: {
    fontSize: "13.5px",
    color: "var(--color-slate-500)",
  },
  paginationBtns: {
    display: "flex",
    gap: "6px",
  },
  pageBtn: {
    width: "36px",
    height: "36px",
    border: "1px solid var(--color-slate-200)",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: "600",
    backgroundColor: "var(--color-white)",
    color: "var(--color-slate-600)",
    cursor: "pointer",
    transition: "all 0.15s ease",
    outline: "none",
  },
  panelBackdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.25)",
    backdropFilter: "blur(2px)",
    WebkitBackdropFilter: "blur(2px)",
    zIndex: 998,
  },
  profilePanel: {
    position: "fixed",
    top: 0,
    right: 0,
    bottom: 0,
    width: "440px",
    maxWidth: "100vw",
    backgroundColor: "var(--color-white)",
    borderRadius: "14px 0 0 14px",
    boxShadow: "-8px 0 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)",
    zIndex: 999,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  panelTitleBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 18px",
    borderBottom: "1px solid var(--color-slate-100)",
    flexShrink: 0,
  },
  panelCloseBtn: {
    background: "none",
    border: "none",
    fontSize: "22px",
    color: "var(--color-slate-400)",
    cursor: "pointer",
    lineHeight: 1,
    padding: "2px 6px",
    borderRadius: "6px",
    transition: "color 0.15s",
  },
  panelBody: {
    overflowY: "auto",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "0",
  },
  panelAvatarRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px 18px",
  },
  panelAvatar: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    backgroundColor: "#1e3a8a",
    color: "var(--color-white)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "14px",
    flexShrink: 0,
  },
  panelEditBtn: {
    background: "none",
    border: "1px solid var(--color-slate-200)",
    borderRadius: "7px",
    cursor: "pointer",
    color: "var(--color-slate-500)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "5px",
    flexShrink: 0,
    transition: "all 0.15s",
  },
  panelSection: {
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  panelSectionTitle: {
    fontSize: "13px",
    fontWeight: "700",
    color: "var(--color-slate-900)",
  },

  loadingText: {
    color: "var(--color-slate-400)",
    fontSize: "14px",
    margin: 0,
  },
  emptyText: {
    color: "var(--color-slate-400)",
    fontSize: "14px",
    margin: 0,
    fontStyle: "italic",
  },
  taskList: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  taskItem: {
    border: "1px solid var(--color-slate-200)",
    borderRadius: "10px",
    padding: "16px",
    backgroundColor: "#fafbff",
  },
  taskHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  },
  taskTitle: {
    fontSize: "14px",
    fontWeight: "700",
    color: "var(--color-slate-800)",
    margin: 0,
  },
  taskDesc: {
    fontSize: "13.5px",
    color: "var(--color-slate-600)",
    margin: "8px 0 0 0",
    lineHeight: 1.4,
  },
  taskMeta: {
    fontSize: "12px",
    color: "var(--color-slate-400)",
    margin: "8px 0 0 0",
  },
  badge: {
    fontSize: "11px",
    fontWeight: "600",
    padding: "3px 10px",
    borderRadius: "20px",
  },
  assignFormContainer: {
    backgroundColor: "var(--color-slate-50)",
    border: "1px solid var(--color-slate-300)",
    borderRadius: "12px",
    padding: "20px",
  },
  assignForm: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    marginTop: "16px",
  },
  formRow: {
    display: "flex",
    gap: "16px",
  },
  formLabel: {
    display: "block",
    fontSize: "12px",
    fontWeight: "600",
    color: "var(--color-slate-600)",
    marginBottom: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  },
  formInput: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid var(--color-slate-300)",
    borderRadius: "8px",
    fontSize: "14px",
    color: "var(--color-slate-800)",
    backgroundColor: "var(--color-white)",
    outline: "none",
    fontFamily: "inherit",
  },
  submitBtn: {
    alignSelf: "flex-end",
    backgroundColor: "var(--color-primary)",
    color: "var(--color-white)",
    border: "none",
    borderRadius: "8px",
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.15s",
  },
};
