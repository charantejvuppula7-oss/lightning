import { useState, useEffect, useCallback, useContext } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { FilterSelect, SearchBar } from '../../shared/components/SearchControls.jsx';
import { useFeedback } from '../../shared/components/Feedback.jsx';
import { apiList, apiRequest, errorMessage } from '../../shared/api/apiClient.js';
import { ProjectSelectionContext } from '../projects/projectSelectionContext.js';
import { hasSidebarPermission } from '../../layouts/sidebarNavigation.js';
import { roleSlug as getRoleSlug } from '../../shared/utils/roles.js';
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
        className="min-h-screen! flex! items-center! justify-center! [background:var(--color-slate-50)]! [font-family:Inter,_sans-serif]!"
      >
        <p className="[color:var(--color-slate-500)]! text-[15px]!">Loading…</p>
      </div>
    );
  }

  const selectedUserObj = users.find((u) => u.id === selectedUserId);
  const userTasks = selectedUserId ? tasksByUser[selectedUserId] || [] : [];
  const userDeps = selectedUserId ? dependenciesByUser[selectedUserId] || [] : [];

  return (
    <div className="w-full! min-w-0!">
      {feedback}
      {editingUser && <UserEditor key={editingUser.id || "new"} initial={editingUser} projectId={selectedProjectId} onClose={() => setEditingUser(null)} onSaved={() => { setEditingUser(null); loadUsers(); }} />}

      <div className="w-full! min-w-0!">
        <div className="p-[24px_32px]! overflow-y-auto! flex-1!">
          {/* Title Header Row */}
          <div className="flex! justify-between! items-center! mb-[24px]! mt-[16px]!">
            <div>
              <h1 className="text-[26px]! font-bold! [color:var(--color-slate-900)]! m-0!">Team Members</h1>
              <p className="text-[14px]! [color:var(--color-slate-500)]! mt-[6px]! m-0!">Members assigned to the selected project.</p>
            </div>
            {canCreateUser && (
              <button
                onClick={() => setEditingUser({})}
                className="[background-color:var(--color-primary)]! [color:var(--color-white)]! border-0! rounded-[8px]! p-[10px_18px]! text-[14px]! font-semibold! cursor-pointer! [transition:background-color_0.15s_ease]!"
              >
                + Create User
              </button>
            )}
          </div>

          {/* Filter and Table Container */}
          <div className="[background-color:var(--color-white)]! rounded-[14px]! [border:1px_solid_var(--color-slate-200)]! [box-shadow:0_1px_3px_rgba(0,0,0,0.02),_0_1px_2px_rgba(0,0,0,0.01)]! p-[24px]! mb-[32px]!">
            {/* Filter Bar */}
            <div className="flex! justify-between! items-center! mb-[20px]! gap-[16px]! flex-wrap!">
              <SearchBar
                placeholder="Search user"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                wrapperClassName="[position:relative]! [width:400px]!"
                iconClassName="[position:absolute]! [left:12px]! [top:50%]! [transform:translateY(-50%)]! [color:var(--color-slate-400)]! [font-size:20px]!"
                inputClassName="[width:100%]! [padding:10px_14px_10px_42px]! [border:1px_solid_var(--color-slate-300)]! [border-radius:8px]! [font-size:14px]! [color:var(--color-slate-800)]! [outline:none]! [background-color:var(--color-white)]!"
              />

              <div className="flex! items-center! gap-[12px]!">
                <FilterSelect
                  value={selectedRole}
                  onChange={(e) => {
                    setSelectedRole(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="roles-select"
                  controlClassName="[padding:10px_32px_10px_16px]! [border:1px_solid_var(--color-slate-300)]! [border-radius:8px]! [font-size:14px]! [background-color:var(--color-white)]! [color:var(--color-slate-600)]! [cursor:pointer]! [outline:none]! [min-width:160px]!"
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
                  controlClassName="[padding:10px_32px_10px_16px]! [border:1px_solid_var(--color-slate-300)]! [border-radius:8px]! [font-size:14px]! [background-color:var(--color-white)]! [color:var(--color-slate-600)]! [cursor:pointer]! [outline:none]! [min-width:160px]!"
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

                <button onClick={handleClearFilters} className="[background:none]! border-0! [color:var(--color-slate-600)]! font-medium! cursor-pointer! text-[14px]! p-[6px_12px]! rounded-[6px]! [transition:background-color_0.15s]!">
                  Clear
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="[border:1px_solid_var(--color-slate-200)]! rounded-[10px]! overflow-hidden! [background-color:var(--color-white)]!">
              <table className="w-full! [border-collapse:collapse]! text-[14px]! text-left!">
                <thead>
                  <tr>
                    <th className="p-[14px_20px]! [background-color:var(--color-primary-subtle)]! [color:var(--color-primary-hover)]! font-semibold! text-[13px]! [border-bottom:1.5px_solid_var(--color-primary-border)]!">Team Member</th>
                    <th className="p-[14px_20px]! [background-color:var(--color-primary-subtle)]! [color:var(--color-primary-hover)]! font-semibold! text-[13px]! [border-bottom:1.5px_solid_var(--color-primary-border)]!">Email ID</th>
                    <th className="p-[14px_20px]! [background-color:var(--color-primary-subtle)]! [color:var(--color-primary-hover)]! font-semibold! text-[13px]! [border-bottom:1.5px_solid_var(--color-primary-border)]!">Roles</th>
                    <th className="p-[14px_20px]! [background-color:var(--color-primary-subtle)]! [color:var(--color-primary-hover)]! font-semibold! text-[13px]! [border-bottom:1.5px_solid_var(--color-primary-border)]!">Department</th>
                    <th className="p-[14px_20px]! [background-color:var(--color-primary-subtle)]! [color:var(--color-primary-hover)]! font-semibold! text-[13px]! [border-bottom:1.5px_solid_var(--color-primary-border)]! text-right!">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-[32px]! text-center! [color:var(--color-slate-400)]! text-[15px]!">
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
                        <tr key={user.id} className={"table-row-hover" + " " + "[border-bottom:1px_solid_var(--color-slate-100)]! [transition:background-color_0.15s_ease]!"} >
                          <td className="p-[14px_20px]! [color:var(--color-slate-600)]! [vertical-align:middle]!">
                            <div className="flex! items-center! gap-[12px]!">
                              <div
                                className="w-[36px]! h-[36px]! rounded-[50%]! [background-color:#1e3a8a]! [color:var(--color-white)]! flex! items-center! justify-center! font-bold! text-[13px]! cursor-pointer! select-none!"
                                title={
                                  user.user_name ||
                                  user.username ||
                                  user.user_name ||
                                  `${user.first_name || ""} ${user.last_name || ""}`.trim()
                                }
                              >
                                {getInitials(user)}
                              </div>
                              <span className="font-semibold! [color:var(--color-slate-800)]!">
                                {user.first_name} {user.last_name}
                              </span>
                            </div>
                          </td>
                          <td className="p-[14px_20px]! [color:var(--color-slate-600)]! [vertical-align:middle]!">{user.email}</td>
                          <td className="p-[14px_20px]! [color:var(--color-slate-600)]! [vertical-align:middle]!">
                            <span className="inline-block! p-[4px_10px]! rounded-[12px]! text-[12px]! font-semibold!" style={{
  backgroundColor: badgeBg,
  color: badgeColor
}}>
                              {roleLabel}
                            </span>
                          </td>
                          <td className="p-[14px_20px]! [color:var(--color-slate-600)]! [vertical-align:middle]!">{user.department || "General"}</td>
                          <td className="p-[14px_20px]! [color:var(--color-slate-600)]! [vertical-align:middle]! text-right!">
                            <div className="flex! items-center! justify-end! gap-[8px]!">
                              <button
                                className="action-icon-btn view"
                                title="View details & tasks"
                                onClick={() => handleViewUser(user)}
                              >
                                <span className={"material-symbols-outlined" + " " + "text-[20px]!"} >visibility</span>
                              </button>
                              {canEditUser && (
                                <button
                                  className="action-icon-btn edit"
                                  title="Edit user details"
                                  onClick={() => setEditingUser(user)}
                                >
                                  <span className={"material-symbols-outlined" + " " + "text-[20px]!"} >edit</span>
                                </button>
                              )}
                              {canDeleteUser && (
                                <button
                                  className="action-icon-btn delete"
                                  title="Delete user"
                                  onClick={() => handleDeleteUser(user.id, `${user.first_name} ${user.last_name}`)}
                                >
                                  <span className={"material-symbols-outlined" + " " + "text-[20px]!"} >delete</span>
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
            <div className="flex! justify-between! items-center! mt-[20px]!">
              <span className="text-[13.5px]! [color:var(--color-slate-500)]!">
                Showing {startItem} to {endItem} of {filteredUsers.length} users
              </span>

              <div className="flex! gap-[6px]!">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  className="w-[36px]! h-[36px]! [border:1px_solid_var(--color-slate-200)]! rounded-[8px]! flex! items-center! justify-center! text-[13px]! font-semibold! [background-color:var(--color-white)]! [transition:all_0.15s_ease]! outline-none!" style={{
  color: currentPage === 1 ? "var(--color-slate-300)" : "var(--color-slate-600)",
  cursor: currentPage === 1 ? "not-allowed" : "pointer"
}}
                >
                  &lt;
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className="w-[36px]! h-[36px]! [border:1px_solid_var(--color-slate-200)]! rounded-[8px]! flex! items-center! justify-center! text-[13px]! font-semibold! cursor-pointer! [transition:all_0.15s_ease]! outline-none!" style={{
  backgroundColor: currentPage === p ? "var(--color-primary)" : "var(--color-white)",
  color: currentPage === p ? "var(--color-white)" : "var(--color-slate-600)",
  borderColor: currentPage === p ? "var(--color-primary)" : "var(--color-slate-200)"
}}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  className="w-[36px]! h-[36px]! [border:1px_solid_var(--color-slate-200)]! rounded-[8px]! flex! items-center! justify-center! text-[13px]! font-semibold! [background-color:var(--color-white)]! [transition:all_0.15s_ease]! outline-none!" style={{
  color: currentPage === totalPages ? "var(--color-slate-300)" : "var(--color-slate-600)",
  cursor: currentPage === totalPages ? "not-allowed" : "pointer"
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

      {isDetailModalOpen && selectedUserObj && (
        <>
          {/* Backdrop */}
          <div
            className="fixed! top-[0]! left-[0]! right-[0]! bottom-[0]! [background-color:rgba(15,_23,_42,_0.25)]! [backdrop-filter:blur(2px)]! [-webkit-backdrop-filter:blur(2px)]! z-[998]!"
            onClick={() => setIsDetailModalOpen(false)}
          />

          {/* Panel */}
          <div className={"profile-panel" + " " + "fixed! top-[0]! right-[0]! bottom-[0]! w-[440px]! max-w-[100vw]! [background-color:var(--color-white)]! rounded-[14px_0_0_14px]! [box-shadow:-8px_0_40px_rgba(0,0,0,0.15),_0_0_0_1px_rgba(0,0,0,0.05)]! z-[999]! flex! flex-col! overflow-hidden!"} >
            {/* Panel Title Bar */}
            <div className="flex! items-center! justify-between! p-[14px_18px]! [border-bottom:1px_solid_var(--color-slate-100)]! shrink-0!">
              <span className="text-[13px]! font-semibold! [color:var(--color-slate-600)]!">
                Members Profile
              </span>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="[background:none]! border-0! text-[22px]! [color:var(--color-slate-400)]! cursor-pointer! leading-[1]! p-[2px_6px]! rounded-[6px]! [transition:color_0.15s]!"
                title="Close"
              >
                ×
              </button>
            </div>

            {/* Scrollable body */}
            <div  className={"profile-panel-body" + " " + "overflow-y-auto! flex-1! flex! flex-col! gap-[0]!"}>
              {/* ── Avatar + Name Row ── */}
              <div  className={"panel-avatar-row" + " " + "flex! items-center! gap-[12px]! p-[16px_18px]!"}>
                <div className="w-[42px]! h-[42px]! rounded-[50%]! [background-color:#1e3a8a]! [color:var(--color-white)]! flex! items-center! justify-center! font-bold! text-[14px]! shrink-0!">
                  {getInitials(selectedUserObj)}
                </div>
                <div className="flex-1! min-w-0!">
                  <div className="text-[15px]! font-bold! [color:var(--color-slate-900)]!">
                    {selectedUserObj.first_name} {selectedUserObj.last_name}
                  </div>
                  <div className="text-[12.5px]! [color:var(--color-slate-500)]! mt-[2px]!">
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
                    className="[background:none]! [border:1px_solid_var(--color-slate-200)]! rounded-[7px]! cursor-pointer! [color:var(--color-slate-500)]! inline-flex! items-center! justify-center! p-[5px]! shrink-0! [transition:all_0.15s]!"
                  >
                    <span className={"material-symbols-outlined" + " " + "text-[15px]!"} >edit</span>
                  </button>
                )}
              </div>

              <hr className="profile-section-divider" />

              {/* ── Contact ── */}
              <div  className={"panel-body-content" + " " + "p-[16px_18px]! flex! flex-col! gap-[12px]!"}>
                <div className="text-[13px]! font-bold! [color:var(--color-slate-900)]!">Contact</div>
                <hr className={"profile-section-divider" + " " + "mb-[14px]!"}  />
                <div className="profile-row">
                  <div>
                    <div className="profile-field-label">Work Email</div>
                    <div className={"profile-field-value" + " " + "[word-break:break-all]!"} >
                      {selectedUserObj.email || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="profile-field-label">Alternative Email</div>
                    <div className={"profile-field-value" + " " + "[word-break:break-all]!"} >
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
              <div  className={"panel-body-content" + " " + "p-[16px_18px]! flex! flex-col! gap-[12px]!"}>
                <div className="text-[13px]! font-bold! [color:var(--color-slate-900)]!">Roles &amp; Permission</div>
                <hr className={"profile-section-divider" + " " + "mb-[14px]!"}  />
                <div className="profile-row">
                  <div>
                    <div className="profile-field-label">Workspace and Role</div>
                    <div className={"profile-field-value" + " " + "[text-transform:capitalize]!"} >
                      {selectedUserObj.role === "pm" ? "Project Manager" : selectedUserObj.role || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="profile-field-label">Account Status</div>
                    <div className="flex! items-center! gap-[5px]! mt-[2px]!">
                      <span className="w-[7px]! h-[7px]! rounded-[50%]! inline-block! shrink-0!" style={{
  backgroundColor: selectedUserObj.Active === false || selectedUserObj.account_status === "inactive" ? "var(--color-danger)" : "var(--color-success-alt)"
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
                              <div className="text-[11px]! [color:var(--color-slate-400)]!">
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
              <div  className={"panel-body-content" + " " + "p-[16px_18px]! flex! flex-col! gap-[12px]!"}>
                <div className="text-[13px]! font-bold! [color:var(--color-slate-900)]!">Reports to</div>
                <hr className={"profile-section-divider" + " " + "mb-[14px]!"}  />
                {selectedUserObj.manager_name ? (
                  <div className="flex! items-center! gap-[12px]! [background:var(--color-slate-100)]! rounded-[8px]! p-[10px_14px]!">
                    <div className="w-[36px]! h-[36px]! rounded-[50%]! [background-color:var(--color-primary)]! [color:var(--color-white)]! flex! items-center! justify-center! font-bold! text-[13px]! shrink-0!">
                      {selectedUserObj.manager_name.split(" ").map(word => word[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-[13.5px]! font-semibold! [color:var(--color-slate-800)]!">
                        {selectedUserObj.manager_name}
                      </div>
                      <div className="text-[11.5px]! [color:var(--color-slate-500)]!">Project Manager</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[13px]! [color:var(--color-slate-400)]!">No manager assigned.</p>
                )}
              </div>

              <hr className="profile-section-divider" />

              {/* ── Projects ── */}
              <div  className={"panel-body-content" + " " + "p-[16px_18px]! flex! flex-col! gap-[12px]!"}>
                <div className="text-[13px]! font-bold! [color:var(--color-slate-900)]!">Projects</div>
                <hr className={"profile-section-divider" + " " + "mb-[14px]!"}  />
                {loadingTasks ? (
                  <p className="text-[13px]! [color:var(--color-slate-400)]!">Loading…</p>
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
                      return <p className="text-[13px]! [color:var(--color-slate-400)]!">No projects assigned.</p>;
                    }
                    return (
                      <div className="flex! flex-wrap! gap-[8px]!">
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
              <div  className={"panel-body-content" + " " + "p-[16px_18px]! flex! flex-col! gap-[12px]!"}>
                <div className="text-[13px]! font-bold! [color:var(--color-slate-900)]!">Security</div>
                <hr className={"profile-section-divider" + " " + "mb-[6px]!"}  />

                <div className="profile-security-row">
                  <div className="profile-security-icon">
                    <span className={"material-symbols-outlined" + " " + "text-[18px]! [color:var(--color-success-alt)]!"} >schedule</span>
                  </div>
                  <div>
                    <div className="text-[13.5px]! font-semibold! [color:var(--color-slate-800)]!">Password</div>
                    <div className="text-[11.5px]! [color:var(--color-slate-500)]!">
                      {selectedUserObj.Password_Changed_At
                        ? `Changed ${Math.floor((today - new Date(selectedUserObj.Password_Changed_At)) / 86400000)} days ago`
                        : "Last changed unknown"}
                    </div>
                  </div>
                </div>

                <div className="profile-security-row">
                  <div className="profile-security-icon">
                    <span className={"material-symbols-outlined" + " " + "text-[18px]! [color:var(--color-primary)]!"} >lock</span>
                  </div>
                  <div>
                    <div className="text-[13.5px]! font-semibold! [color:var(--color-slate-800)]!">Last sign-in</div>
                    <div className="text-[11.5px]! [color:var(--color-slate-500)]!">
                      {selectedUserObj.Last_Login
                        ? `${new Date(selectedUserObj.Last_Login).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                        : "No sign-in recorded"}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Tasks (collapsible section) ── */}
              {userDeps.length > 0 && <section className="mb-[20px]!">
                <h3 className="text-[13px]! font-bold! [color:var(--color-slate-900)]!">Assigned Dependencies ({userDeps.length})</h3>
                {userDeps.map(dependency => <p key={dependency.id} className="text-[13px]! p-[8px]!">{dependency.description} · {dependency.status.replaceAll('_', ' ')}</p>)}
              </section>}
              {userTasks.length > 0 && (
                <>
                  <hr className="profile-section-divider" />
                  <div  className={"panel-body-content" + " " + "p-[16px_18px]! flex! flex-col! gap-[12px]!"}>
                    <div className="text-[13px]! font-bold! [color:var(--color-slate-900)]!">Assigned Tasks ({userTasks.length})</div>
                    <hr className={"profile-section-divider" + " " + "mb-[10px]!"}  />
                    <div className="flex! flex-col! gap-[10px]!">
                      {userTasks.slice(0, 5).map((task) => {
                        const st = statusColor[task.status] || statusColor.open;
                        return (
                          <div key={task.id} className="[border:1px_solid_var(--color-slate-200)]! rounded-[8px]! p-[12px_14px]! [background-color:#fafbff]!">
                            <div className="flex! justify-between! items-center! gap-[8px]!">
                              <span className="text-[13px]! font-semibold! [color:var(--color-slate-800)]!">
                                {task.Task_Name || "Unnamed Task"}
                              </span>
                              <span className="text-[11px]! font-semibold! p-[3px_10px]! rounded-[20px]! whitespace-nowrap!" style={{
  background: st.bg,
  color: st.color
}}>
                                {st.label}
                              </span>
                            </div>
                            <div className="text-[11.5px]! [color:var(--color-slate-400)]! mt-[5px]!">
                              {task.project_name && `📁 ${task.project_name}`}
                              {task.Due_Date && ` · 📅 ${new Date(task.Due_Date).toLocaleDateString()}`}
                            </div>
                          </div>
                        );
                      })}
                      {userTasks.length > 5 && (
                        <p className="text-[12px]! [color:var(--color-slate-400)]! text-center!">
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
