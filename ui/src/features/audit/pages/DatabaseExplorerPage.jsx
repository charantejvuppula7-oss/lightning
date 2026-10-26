import { prepareRecordForm, serializeRecordForm } from '../recordForm.js'
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import { SearchBar } from "../../../components/common/SearchControls.jsx";
import MonitoringHeader from '../components/MonitoringHeader.jsx'
import { adminFetch as fetch } from "../api/adminApi.js";
import AdminPageLayout from "../components/AdminPageLayout.jsx";

export default function DatabaseExplorerPage({ user }) {
  const [searchParams] = useSearchParams();
  const [feedback, setFeedback] = useState('')
  const toast = { success: setFeedback, error: setFeedback }
  // ── Tables List State ──────────────────────────────────────────────
  const [tables, setTables] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [activeTableKey, setActiveTableKey] = useState(() => searchParams.get("table") || "users");

  // ── Active Table Data State ────────────────────────────────────────
  const [tableData, setTableData] = useState({
    table_key: "users",
    display_name: "Users",
    columns: [],
    rows: [],
    pagination: { page: 1, page_size: 25, total_count: 0, total_pages: 1 },
  });
  const [dataLoading, setDataLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("search") || "");
  const [sortField, setSortField] = useState("");
  const [sortDir, setSortDir] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const requestedTable = searchParams.get("table") || "users";
    const requestedSearch = searchParams.get("search") || "";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Keep table selection in sync with browser navigation.
    setActiveTableKey((current) => current === requestedTable ? current : requestedTable);
    setSearchQuery((current) => current === requestedSearch ? current : requestedSearch);
    setCurrentPage(1);
  }, [searchParams]);

  // ── Record Inspection Modal ────────────────────────────────────────
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState("formatted"); // 'formatted' | 'json'

  // ── Edit & Delete Record States ────────────────────────────────────
  const [editingRecord, setEditingRecord] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [deletingRecord, setDeletingRecord] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // ── Fetch Tables Metadata ──────────────────────────────────────────
  const fetchTables = useCallback(async () => {
    setTablesLoading(true);
    try {
      const res = await fetch(`/admin/database/tables/`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Unable to load database data");
      if (res.ok) {
        const data = await res.json();
        setTables(data);
        if (data.length > 0 && !activeTableKey) {
          setActiveTableKey(data[0].table_key);
        }
      }
    } catch (err) {
      setFeedback("Unable to load database tables. Try Refresh.");
      console.error("Error fetching database tables:", err);
    } finally {
      setTablesLoading(false);
    }
  }, [activeTableKey]);

  useEffect(() => {
    const start = setTimeout(fetchTables, 0);
    return () => clearTimeout(start);
  }, [fetchTables]);

  // ── Fetch Selected Table Records ───────────────────────────────────
  const fetchTableData = useCallback(async () => {
    if (!activeTableKey) return;
    setDataLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", currentPage);
      params.set("page_size", 25);
      if (searchQuery) params.set("search", searchQuery);
      if (sortField) {
        params.set("sort_field", sortField);
        params.set("sort_dir", sortDir);
      }

      const res = await fetch(`/admin/database/table/${activeTableKey}/?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Unable to load database data");
      if (res.ok) {
        const data = await res.json();
        setTableData(data);
      }
    } catch (err) {
      setFeedback("Unable to load table records. Try Refresh.");
      console.error("Error fetching table data:", err);
    } finally {
      setDataLoading(false);
    }
  }, [activeTableKey, currentPage, searchQuery, sortField, sortDir]);

  useEffect(() => {
    const start = setTimeout(fetchTableData, 0);
    return () => clearTimeout(start);
  }, [fetchTableData]);

  // Reset pagination on table change
  const handleSelectTable = (tableKey) => {
    setActiveTableKey(tableKey);
    setCurrentPage(1);
    setSearchQuery("");
    setSortField("");
  };

  // Sort toggle
  const handleSort = (columnName) => {
    if (sortField === columnName) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(columnName);
      setSortDir("asc");
    }
  };

  // Inspect record
  const handleInspect = async (row) => {
    setSelectedRecord(row);
    setIsModalOpen(true);
    // Optionally fetch full deep detail if needed
    try {
      const recId = row.id || row.Id;
      if (recId) {
        const res = await fetch(`/admin/database/table/${activeTableKey}/${recId}/`, {
          credentials: "include",
        });
        if (res.ok) {
          const deepData = await res.json();
          setSelectedRecord(deepData.data);
        }
      }
    } catch (e) {
      console.error("Detail fetch error:", e);
    }
  };

  // ── Edit Record Handlers ───────────────────────────────────────────
  const handleOpenEdit = async (row) => {
    setEditError("");
    setEditingRecord(row);
    const initial = prepareRecordForm(row, tableData.columns);
    setEditFormData(initial);
    setIsEditModalOpen(true);

    const recId = row.id || row.Id;
    if (recId) {
      try {
        const res = await fetch(`/admin/database/table/${activeTableKey}/${recId}/`, {
          credentials: "include",
        });
        if (res.ok) {
          const deepData = await res.json();
          if (deepData.data) {
            setEditFormData(prepareRecordForm(deepData.data, tableData.columns));
          }
        }
      } catch (err) {
        console.error("Detail fetch error for edit:", err);
      }
    }
  };

  const handleEditChange = (fieldName, value) => {
    setEditFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingRecord) return;
    const recId = editingRecord.id || editingRecord.Id;
    setIsSaving(true);
    setEditError("");

    try {
      const payload = serializeRecordForm(editFormData, tableData.columns);

      const res = await fetch(`/admin/database/table/${activeTableKey}/${recId}/`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Record updated successfully!");
        setIsEditModalOpen(false);
        setEditingRecord(null);
        if (isModalOpen) setIsModalOpen(false);
        fetchTableData();
      } else {
        setEditError(data.message || "Failed to update record");
        toast.error(data.message || "Failed to update record");
      }
    } catch (err) {
      console.error("Error updating record:", err);
      setEditError(err.message || "Server error updating record");
      toast.error("Server error updating record");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete Record Handlers ─────────────────────────────────────────
  const handleOpenDelete = (row) => {
    setDeleteError("");
    setDeletingRecord(row);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return;
    const recId = deletingRecord.id || deletingRecord.Id;
    setIsDeleting(true);
    setDeleteError("");

    try {
      const res = await fetch(`/admin/database/table/${activeTableKey}/${recId}/`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Record deleted successfully!");
        setIsDeleteModalOpen(false);
        setDeletingRecord(null);
        if (isModalOpen) setIsModalOpen(false);
        fetchTableData();
        fetchTables();
      } else {
        setDeleteError(data.message || "Failed to delete record");
        toast.error(data.message || "Failed to delete record");
      }
    } catch (err) {
      console.error("Error deleting record:", err);
      setDeleteError("Server error deleting record");
      toast.error("Server error deleting record");
    } finally {
      setIsDeleting(false);
    }
  };

  // Group tables by category
  const categorizedTables = tables.reduce((acc, tbl) => {
    const cat = tbl.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tbl);
    return acc;
  }, {});

  const currentTableMeta = tables.find((t) => t.table_key === activeTableKey) || {};

  return (
    <AdminPageLayout user={user}>

      {/* Admin Sidebar */}


      {/* Main Container */}
      <div style={styles.mainContainer}>
        {/* Top Header */}
        <MonitoringHeader user={user} title="Database UI Explorer" subtitle="Live schema introspection & direct model data viewer" icon="database" actions={<><button
              type="button"
              onClick={() => {
                fetchTables();
                fetchTableData();
              }}
              style={styles.refreshBtn}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                refresh
              </span>
              Refresh
            </button></>} />

        {feedback && <div role="status" style={{ padding: "8px 32px" }}>{feedback}</div>}
        {/* Workspace: 2-Column (Left: Tables Navigation, Right: Table Data Grid) */}
        <div style={styles.workspaceBody}>
          <div style={styles.twoColLayout}>
            {/* Left Column: Tables List */}
            <div style={styles.tablesListCol}>
              <div style={styles.tableListCard}>
                <div style={styles.tableListHeader}>
                  <span style={{ fontWeight: "700", fontSize: "13px", color: "var(--color-slate-900)" }}>Database Tables</span>
                  <span style={styles.tableCountPill}>{tables.length} models</span>
                </div>

                <div style={styles.tableListScroll}>
                  {tablesLoading ? (
                    <div style={{ padding: "24px", textAlign: "center" }}>
                      <span className="spinner" />
                    </div>
                  ) : (
                    Object.entries(categorizedTables).map(([category, catTables]) => (
                      <div key={category} style={{ marginBottom: "16px" }}>
                        <div style={styles.categoryTitle}>{category}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                          {catTables.map((tbl) => {
                            const isSelected = tbl.table_key === activeTableKey;
                            return (
                              <div
                                key={tbl.table_key}
                                className={`tbl-nav-item ${isSelected ? "active" : ""}`}
                                onClick={() => handleSelectTable(tbl.table_key)}
                                style={{
                                  ...styles.tableNavItem,
                                  backgroundColor: isSelected ? "var(--color-primary-subtle)" : "transparent",
                                  color: isSelected ? "var(--color-primary)" : "var(--color-slate-700)",
                                  fontWeight: isSelected ? "600" : "500",
                                }}
                              >
                                <span
                                  className="material-symbols-outlined"
                                  style={{
                                    fontSize: "18px",
                                    color: isSelected ? "var(--color-primary)" : "var(--color-slate-500)",
                                  }}
                                >
                                  {tbl.icon || "table_chart"}
                                </span>
                                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {tbl.display_name}
                                </span>
                                <span style={styles.rowCountBadge}>{tbl.row_count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Active Table Viewer */}
            <div style={styles.dataGridCol}>
              {/* Table Meta & Search Toolbar */}
              <div style={styles.gridToolbar}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <h2 style={styles.activeTableTitle}>{tableData.display_name}</h2>
                  <span style={styles.activeTableCount}>
                    {tableData.pagination.total_count} total records
                  </span>
                </div>

                <SearchBar
                  placeholder={`Search ${tableData.display_name}...`}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  wrapperStyle={styles.searchWrapper}
                  iconStyle={styles.searchIcon}
                  inputStyle={styles.searchInput}
                />
              </div>

              {/* Data Table Card */}
              <div style={styles.tableCard}>
                <div style={styles.tableResponsiveWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ ...styles.th, width: "60px", textAlign: "center" }}>#</th>
                        {tableData.columns.map((col) => (
                          <th
                            key={col.name}
                            onClick={() => handleSort(col.name)}
                            style={{
                              ...styles.th,
                              cursor: "pointer",
                            }}
                            title={`Sort by ${col.name} (${col.type})`}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <span>{col.name}</span>
                              <span style={{ fontSize: "10px", color: "var(--color-slate-400)", fontWeight: "400" }}>
                                ({col.type.replace("Field", "")})
                              </span>
                              {sortField === col.name && (
                                <span className="material-symbols-outlined" style={{ fontSize: "14px", color: "var(--color-primary)" }}>
                                  {sortDir === "asc" ? "arrow_upward" : "arrow_downward"}
                                </span>
                              )}
                            </div>
                          </th>
                        ))}
                        <th style={{ ...styles.th, width: "110px", textAlign: "center" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dataLoading ? (
                        <tr>
                          <td colSpan={tableData.columns.length + 2} style={{ ...styles.emptyCell, padding: "40px" }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                              <span className="spinner" />
                              <span style={{ color: "var(--color-slate-500)" }}>Loading {tableData.display_name} records...</span>
                            </div>
                          </td>
                        </tr>
                      ) : tableData.rows.length === 0 ? (
                        <tr>
                          <td colSpan={tableData.columns.length + 2} style={styles.emptyCell}>
                            No records found in this table.
                          </td>
                        </tr>
                      ) : (
                        tableData.rows.map((row, idx) => (
                          <tr key={row.id || idx} className="db-row" style={styles.tr}>
                            <td style={{ ...styles.td, textAlign: "center", color: "var(--color-slate-400)", fontSize: "11px" }}>
                              {(tableData.pagination.page - 1) * tableData.pagination.page_size + idx + 1}
                            </td>
                            {tableData.columns.map((col) => {
                              const val = row[col.name];
                              let displayVal = val;
                              if (val === null || val === undefined) {
                                displayVal = <span style={{ color: "var(--color-slate-300)" }}>NULL</span>;
                              } else if (typeof val === "boolean") {
                                displayVal = (
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      padding: "1px 6px",
                                      borderRadius: "4px",
                                      backgroundColor: val ? "var(--color-success-bg)" : "var(--color-danger-border)",
                                      color: val ? "var(--color-success-dark)" : "#b91c1c",
                                      fontWeight: "600",
                                    }}
                                  >
                                    {val ? "TRUE" : "FALSE"}
                                  </span>
                                );
                              } else if (typeof val === "object") {
                                displayVal = <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#7c3aed" }}>{JSON.stringify(val).slice(0, 30)}...</span>;
                              } else if (String(val).length > 40) {
                                displayVal = `${String(val).slice(0, 40)}…`;
                              }

                              return (
                                <td key={col.name} style={styles.td} title={String(val)}>
                                  {displayVal}
                                </td>
                              );
                            })}
                            <td style={{ ...styles.td, textAlign: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                                <button
                                  type="button"
                                  onClick={() => handleInspect(row)}
                                  style={styles.inspectBtn}
                                  title="Inspect Details"
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                                    visibility
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(row)}
                                  style={styles.editBtn}
                                  title="Edit Record"
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                                    edit
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenDelete(row)}
                                  style={styles.deleteBtn}
                                  title="Delete Record"
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                                    delete
                                  </span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Footer */}
                {tableData.pagination.total_pages > 1 && (
                  <div style={styles.paginationRow}>
                    <span style={styles.paginationText}>
                      Showing page {tableData.pagination.page} of {tableData.pagination.total_pages} ({tableData.pagination.total_count} total records)
                    </span>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        disabled={tableData.pagination.page <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        style={styles.pageBtn}
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={tableData.pagination.page >= tableData.pagination.total_pages}
                        onClick={() => setCurrentPage((p) => p + 1)}
                        style={styles.pageBtn}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Record Inspection Modal ─── */}
      {isModalOpen && selectedRecord && (
        <div style={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "var(--color-primary)" }}>
                  database
                </span>
                <h3 style={styles.modalTitle}>
                  Record Details: {currentTableMeta.display_name || activeTableKey}
                </h3>
              </div>
              <button
                type="button"
                style={styles.modalCloseBtn}
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div style={styles.modalTabRow}>
              <button
                type="button"
                style={{
                  ...styles.modalTabBtn,
                  ...(modalTab === "formatted" ? styles.modalTabBtnActive : {}),
                }}
                onClick={() => setModalTab("formatted")}
              >
                Key-Value Fields
              </button>
              <button
                type="button"
                style={{
                  ...styles.modalTabBtn,
                  ...(modalTab === "json" ? styles.modalTabBtnActive : {}),
                }}
                onClick={() => setModalTab("json")}
              >
                Raw JSON
              </button>
            </div>

            {/* Modal Body */}
            <div style={styles.modalBody}>
              {modalTab === "formatted" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {Object.entries(selectedRecord).map(([key, val]) => (
                    <div key={key} style={styles.recordFieldRow}>
                      <div style={styles.recordFieldKey}>{key}</div>
                      <div style={styles.recordFieldVal}>
                        {val === null || val === undefined ? (
                          <span style={{ color: "var(--color-slate-400)" }}>NULL</span>
                        ) : typeof val === "object" ? (
                          <pre style={{ margin: 0, fontSize: "11px", backgroundColor: "var(--color-slate-50)", padding: "6px", borderRadius: "4px" }}>
                            {JSON.stringify(val, null, 2)}
                          </pre>
                        ) : (
                          String(val)
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <pre style={styles.jsonBlock}>
                  {JSON.stringify(selectedRecord, null, 2)}
                </pre>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(selectedRecord, null, 2));
                  toast.info("Record JSON copied to clipboard!");
                }}
                style={styles.copyBtn}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                  content_copy
                </span>
                Copy JSON
              </button>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => {
                    const rec = selectedRecord;
                    setIsModalOpen(false);
                    handleOpenEdit(rec);
                  }}
                  style={styles.actionEditBtn}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                    edit
                  </span>
                  Edit Record
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const rec = selectedRecord;
                    setIsModalOpen(false);
                    handleOpenDelete(rec);
                  }}
                  style={styles.actionDeleteBtn}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                    delete
                  </span>
                  Delete Record
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={styles.closeBtn}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Record Modal ─── */}
      {isEditModalOpen && editingRecord && (
        <div style={styles.modalOverlay} onClick={() => setIsEditModalOpen(false)}>
          <div style={{ ...styles.modalCard, width: "720px" }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "22px", color: "var(--color-primary)" }}>
                  edit_note
                </span>
                <div>
                  <h3 style={styles.modalTitle}>
                    Edit {currentTableMeta.display_name || activeTableKey} Record
                  </h3>
                  <span style={{ fontSize: "11px", color: "var(--color-slate-500)" }}>
                    ID: {editingRecord.id || editingRecord.Id}
                  </span>
                </div>
              </div>
              <button
                type="button"
                style={styles.modalCloseBtn}
                onClick={() => setIsEditModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div style={styles.modalBody}>
                {editError && (
                  <div style={styles.errorAlertBox}>
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>error</span>
                    {editError}
                  </div>
                )}

                {activeTableKey === "users" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                    {/* Account Credentials */}
                    <div>
                      <div style={styles.editSectionTitle}>Account & Credentials</div>
                      <div style={styles.editGrid}>
                        <div>
                          <label style={styles.fieldLabel}>Username *</label>
                          <input
                            type="text"
                            required
                            value={editFormData.user_name || ""}
                            onChange={(e) => handleEditChange("user_name", e.target.value)}
                            style={styles.editInput}
                            placeholder="username"
                          />
                        </div>
                        <div>
                          <label style={styles.fieldLabel}>Email Address *</label>
                          <input
                            type="email"
                            required
                            value={editFormData.email || ""}
                            onChange={(e) => handleEditChange("email", e.target.value)}
                            style={styles.editInput}
                            placeholder="user@example.com"
                          />
                        </div>
                        <div>
                          <label style={styles.fieldLabel}>Account Status</label>
                          <select
                            value={editFormData.account_status || "active"}
                            onChange={(e) => handleEditChange("account_status", e.target.value)}
                            style={styles.editSelect}
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>
                        <div>
                          <label style={styles.fieldLabel}>Set New Password</label>
                          <input
                            type="password"
                            placeholder="Leave blank to keep unchanged"
                            value={editFormData.password || ""}
                            onChange={(e) => handleEditChange("password", e.target.value)}
                            style={styles.editInput}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Profile Details */}
                    <div>
                      <div style={styles.editSectionTitle}>Personal Information</div>
                      <div style={styles.editGrid}>
                        <div>
                          <label style={styles.fieldLabel}>First Name *</label>
                          <input
                            type="text"
                            required
                            value={editFormData.first_name || ""}
                            onChange={(e) => handleEditChange("first_name", e.target.value)}
                            style={styles.editInput}
                          />
                        </div>
                        <div>
                          <label style={styles.fieldLabel}>Last Name *</label>
                          <input
                            type="text"
                            required
                            value={editFormData.last_name || ""}
                            onChange={(e) => handleEditChange("last_name", e.target.value)}
                            style={styles.editInput}
                          />
                        </div>
                        <div>
                          <label style={styles.fieldLabel}>Employee ID *</label>
                          <input
                            type="text"
                            required
                            value={editFormData.employee_id || ""}
                            onChange={(e) => handleEditChange("employee_id", e.target.value)}
                            style={styles.editInput}
                          />
                        </div>
                        <div>
                          <label style={styles.fieldLabel}>Phone Number</label>
                          <input
                            type="text"
                            value={editFormData.phone_number || ""}
                            onChange={(e) => handleEditChange("phone_number", e.target.value)}
                            style={styles.editInput}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Role & Org */}
                    <div>
                      <div style={styles.editSectionTitle}>Organization & Role</div>
                      <div style={styles.editGrid}>
                        <div>
                          <label style={styles.fieldLabel}>System Role</label>
                          <select
                            value={editFormData.role || editFormData.role_link || "developer"}
                            onChange={(e) => handleEditChange("role", e.target.value)}
                            style={styles.editSelect}
                          >
                            <option value="developer">Developer</option>
                            <option value="pm">Project Manager</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        <div>
                          <label style={styles.fieldLabel}>Designation</label>
                          <input
                            type="text"
                            value={editFormData.designation || ""}
                            onChange={(e) => handleEditChange("designation", e.target.value)}
                            style={styles.editInput}
                          />
                        </div>
                        <div>
                          <label style={styles.fieldLabel}>Department</label>
                          <select
                            value={editFormData.department || editFormData.department_link || ""}
                            onChange={(e) => handleEditChange("department", e.target.value)}
                            style={styles.editSelect}
                          >
                            <option value="">Select department</option>
                            <option value="Hardware">Hardware</option>
                            <option value="Firmware">Firmware</option>
                            <option value="Software">Software</option>
                            <option value="Mechanical">Mechanical</option>
                            <option value="Testing">Testing</option>
                            <option value="Production">Production</option>
                            <option value="Quality Assurance">Quality Assurance</option>
                            <option value="Documentation">Documentation</option>
                            <option value="Management">Management</option>
                          </select>
                        </div>
                        <div>
                          <label style={styles.fieldLabel}>Employment Type</label>
                          <select
                            value={editFormData.employment_type || "full_time"}
                            onChange={(e) => handleEditChange("employment_type", e.target.value)}
                            style={styles.editSelect}
                          >
                            <option value="full_time">Full Time</option>
                            <option value="part_time">Part Time</option>
                            <option value="contract">Contract</option>
                            <option value="intern">Intern</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={styles.editGrid}>
                    {tableData.columns
                      .filter((c) => !c.primary_key && !["created_at", "updated_at"].includes(c.name))
                      .map((col) => {
                        const val = editFormData[col.name];
                        const isBool = col.type && col.type.includes("Boolean");
                        return (
                          <div key={col.name}>
                            <label style={styles.fieldLabel}>{col.verbose_name || col.name}</label>
                            {isBool ? (
                              <select
                                value={String(val === true || val === "true")}
                                onChange={(e) => handleEditChange(col.name, e.target.value === "true")}
                                style={styles.editSelect}
                              >
                                <option value="true">True</option>
                                <option value="false">False</option>
                              </select>
                            ) : col.type === "JSONField" ? (
                              <textarea aria-label={col.verbose_name || col.name} rows={7} value={val ?? ''} onChange={e => handleEditChange(col.name, e.target.value)} style={{ ...styles.editInput, height: 'auto', fontFamily: 'monospace' }} />
                            ) : (
                              <input
                                type={col.type === 'DateTimeField' ? 'datetime-local' : col.type === 'DateField' ? 'date' : 'text'}
                                value={val === null || val === undefined ? "" : String(val)}
                                onChange={(e) => handleEditChange(col.name, e.target.value)}
                                style={styles.editInput}
                              />
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  style={styles.cancelBtn}
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.saveBtn}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      {isDeleteModalOpen && deletingRecord && (
        <div style={styles.modalOverlay} onClick={() => setIsDeleteModalOpen(false)}>
          <div style={{ ...styles.modalCard, width: "480px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ ...styles.modalHeader, borderBottom: "1px solid var(--color-danger-border)", backgroundColor: "var(--color-danger-bg)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "24px", color: "var(--color-danger-dark)" }}>
                  warning
                </span>
                <h3 style={{ ...styles.modalTitle, color: "#991b1b" }}>
                  Delete {currentTableMeta.display_name || activeTableKey} Record
                </h3>
              </div>
              <button
                type="button"
                style={styles.modalCloseBtn}
                onClick={() => setIsDeleteModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "20px 24px" }}>
              <p style={{ fontSize: "14px", color: "var(--color-slate-700)", lineHeight: "1.6", margin: "0 0 16px 0" }}>
                Are you sure you want to permanently delete this record from <strong>{currentTableMeta.display_name || activeTableKey}</strong>?
              </p>

              <div style={{ padding: "12px 16px", backgroundColor: "var(--color-slate-50)", border: "1px solid var(--color-slate-200)", borderRadius: "8px", fontSize: "13px", color: "var(--color-slate-900)", marginBottom: "16px" }}>
                {activeTableKey === "users" ? (
                  <>
                    <div style={{ marginBottom: "4px" }}><strong>Username:</strong> {deletingRecord.user_name}</div>
                    <div style={{ marginBottom: "4px" }}><strong>Name:</strong> {deletingRecord.first_name} {deletingRecord.last_name}</div>
                    <div style={{ marginBottom: "4px" }}><strong>Email:</strong> {deletingRecord.email}</div>
                    <div><strong>Role:</strong> {deletingRecord.role || deletingRecord.role_link || "developer"}</div>
                  </>
                ) : (
                  <>
                    <div style={{ marginBottom: "4px" }}><strong>Record ID:</strong> {deletingRecord.id}</div>
                    {deletingRecord.name && <div style={{ marginBottom: "4px" }}><strong>Name:</strong> {deletingRecord.name}</div>}
                    {deletingRecord.project_name && <div style={{ marginBottom: "4px" }}><strong>Project:</strong> {deletingRecord.project_name}</div>}
                    {deletingRecord.Task_Name && <div><strong>Task:</strong> {deletingRecord.Task_Name}</div>}
                  </>
                )}
              </div>

              {deleteError && (
                <div style={styles.errorAlertBox}>
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>error</span>
                  {deleteError}
                </div>
              )}

              <div style={{ fontSize: "12px", color: "var(--color-danger-dark)", fontWeight: "600" }}>
                ⚠️ Warning: This action will permanently remove this record from the database.
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                type="button"
                style={styles.cancelBtn}
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                style={styles.dangerDeleteBtn}
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPageLayout>
  );
}

const styles = {
  "mainContainer": {
    "flex": 1,
    "display": "flex",
    "flexDirection": "column",
    "minWidth": 0,
    "height": "100vh",
    "overflowY": "auto"
  },
  "refreshBtn": {
    "display": "flex",
    "alignItems": "center",
    "gap": "6px",
    "padding": "8px 14px",
    "backgroundColor": "var(--color-white)",
    "border": "1px solid var(--color-slate-300)",
    "borderRadius": "8px",
    "fontSize": "13px",
    "fontWeight": "600",
    "color": "var(--color-slate-600)",
    "cursor": "pointer"
  },
  "workspaceBody": {
    "padding": "24px 32px",
    "flex": 1
  },
  "twoColLayout": {
    "display": "grid",
    "gridTemplateColumns": "280px 1fr",
    "gap": "24px",
    "alignItems": "flex-start"
  },
  "tablesListCol": {
    "display": "flex",
    "flexDirection": "column"
  },
  "tableListCard": {
    "backgroundColor": "var(--color-white)",
    "border": "1px solid var(--color-slate-200)",
    "borderRadius": "12px",
    "overflow": "hidden",
    "boxShadow": "0 1px 3px rgba(0, 0, 0, 0.04)"
  },
  "tableListHeader": {
    "display": "flex",
    "justifyContent": "space-between",
    "alignItems": "center",
    "padding": "14px 16px",
    "borderBottom": "1px solid var(--color-slate-200)",
    "backgroundColor": "var(--color-slate-50)"
  },
  "tableCountPill": {
    "fontSize": "11px",
    "fontWeight": "600",
    "backgroundColor": "var(--color-slate-200)",
    "color": "var(--color-slate-600)",
    "padding": "2px 8px",
    "borderRadius": "10px"
  },
  "tableListScroll": {
    "padding": "12px",
    "maxHeight": "calc(100vh - 180px)",
    "overflowY": "auto"
  },
  "categoryTitle": {
    "fontSize": "11px",
    "fontWeight": "700",
    "color": "var(--color-slate-400)",
    "textTransform": "uppercase",
    "letterSpacing": "0.06em",
    "padding": "4px 8px"
  },
  "tableNavItem": {
    "display": "flex",
    "alignItems": "center",
    "gap": "8px",
    "padding": "8px 10px",
    "borderRadius": "6px",
    "fontSize": "13px"
  },
  "rowCountBadge": {
    "fontSize": "11px",
    "fontWeight": "600",
    "backgroundColor": "var(--color-slate-100)",
    "color": "var(--color-slate-500)",
    "padding": "1px 6px",
    "borderRadius": "8px"
  },
  "dataGridCol": {
    "display": "flex",
    "flexDirection": "column",
    "gap": "16px",
    "minWidth": 0
  },
  "gridToolbar": {
    "display": "flex",
    "justifyContent": "space-between",
    "alignItems": "center",
    "gap": "16px",
    "flexWrap": "wrap"
  },
  "activeTableTitle": {
    "fontSize": "18px",
    "fontWeight": "700",
    "color": "var(--color-slate-900)",
    "margin": 0
  },
  "activeTableCount": {
    "fontSize": "12px",
    "color": "var(--color-slate-500)",
    "backgroundColor": "var(--color-slate-100)",
    "padding": "2px 8px",
    "borderRadius": "10px"
  },
  "searchWrapper": {
    "position": "relative",
    "width": "320px"
  },
  "searchIcon": {
    "position": "absolute",
    "left": "10px",
    "top": "50%",
    "transform": "translateY(-50%)",
    "color": "var(--color-slate-400)",
    "fontSize": "18px"
  },
  "searchInput": {
    "width": "100%",
    "height": "36px",
    "paddingLeft": "34px",
    "paddingRight": "10px",
    "backgroundColor": "var(--color-white)",
    "border": "1px solid var(--color-slate-300)",
    "borderRadius": "8px",
    "fontSize": "13px",
    "color": "var(--color-slate-900)",
    "outline": "none"
  },
  "tableCard": {
    "backgroundColor": "var(--color-white)",
    "border": "1px solid var(--color-slate-200)",
    "borderRadius": "12px",
    "overflow": "hidden",
    "boxShadow": "0 1px 3px rgba(0, 0, 0, 0.04)"
  },
  "tableResponsiveWrapper": {
    "overflowX": "auto",
    "maxHeight": "calc(100vh - 250px)"
  },
  "table": {
    "width": "100%",
    "borderCollapse": "collapse",
    "fontSize": "12px",
    "textAlign": "left"
  },
  "th": {
    "padding": "10px 14px",
    "backgroundColor": "var(--color-slate-50)",
    "color": "var(--color-slate-600)",
    "fontWeight": "600",
    "fontSize": "11px",
    "borderBottom": "1px solid var(--color-slate-200)",
    "whiteSpace": "nowrap",
    "position": "sticky",
    "top": 0,
    "zIndex": 10
  },
  "tr": {
    "borderBottom": "1px solid var(--color-slate-100)",
    "transition": "background-color 0.12s ease"
  },
  "td": {
    "padding": "10px 14px",
    "color": "var(--color-slate-800)",
    "verticalAlign": "middle",
    "whiteSpace": "nowrap",
    "maxWidth": "280px",
    "overflow": "hidden",
    "textOverflow": "ellipsis"
  },
  "inspectBtn": {
    "background": "none",
    "border": "none",
    "color": "var(--color-slate-500)",
    "cursor": "pointer",
    "padding": "4px",
    "borderRadius": "4px",
    "display": "inline-flex",
    "alignItems": "center",
    "justifyContent": "center",
    "transition": "color 0.15s ease"
  },
  "editBtn": {
    "background": "none",
    "border": "none",
    "color": "var(--color-primary)",
    "cursor": "pointer",
    "padding": "4px",
    "borderRadius": "4px",
    "display": "inline-flex",
    "alignItems": "center",
    "justifyContent": "center",
    "transition": "color 0.15s ease"
  },
  "deleteBtn": {
    "background": "none",
    "border": "none",
    "color": "var(--color-danger)",
    "cursor": "pointer",
    "padding": "4px",
    "borderRadius": "4px",
    "display": "inline-flex",
    "alignItems": "center",
    "justifyContent": "center",
    "transition": "color 0.15s ease"
  },
  "emptyCell": {
    "padding": "32px",
    "textAlign": "center",
    "color": "var(--color-slate-500)"
  },
  "paginationRow": {
    "display": "flex",
    "justifyContent": "space-between",
    "alignItems": "center",
    "padding": "12px 18px",
    "borderTop": "1px solid var(--color-slate-100)"
  },
  "paginationText": {
    "fontSize": "12px",
    "color": "var(--color-slate-500)"
  },
  "pageBtn": {
    "padding": "6px 12px",
    "backgroundColor": "var(--color-white)",
    "border": "1px solid var(--color-slate-300)",
    "borderRadius": "6px",
    "fontSize": "12px",
    "fontWeight": "600",
    "color": "var(--color-slate-700)",
    "cursor": "pointer"
  },
  "modalOverlay": {
    "position": "fixed",
    "inset": 0,
    "backgroundColor": "rgba(15, 23, 42, 0.45)",
    "backdropFilter": "blur(4px)",
    "display": "flex",
    "alignItems": "center",
    "justifyContent": "center",
    "zIndex": 1000
  },
  "modalCard": {
    "width": "680px",
    "maxWidth": "92vw",
    "maxHeight": "85vh",
    "backgroundColor": "var(--color-white)",
    "borderRadius": "14px",
    "boxShadow": "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
    "display": "flex",
    "flexDirection": "column",
    "overflow": "hidden"
  },
  "modalHeader": {
    "display": "flex",
    "justifyContent": "space-between",
    "alignItems": "center",
    "padding": "18px 24px",
    "borderBottom": "1px solid var(--color-slate-200)"
  },
  "modalTitle": {
    "fontSize": "16px",
    "fontWeight": "700",
    "color": "var(--color-slate-900)",
    "margin": 0
  },
  "modalCloseBtn": {
    "background": "none",
    "border": "none",
    "cursor": "pointer",
    "fontSize": "16px",
    "color": "var(--color-slate-400)"
  },
  "modalTabRow": {
    "display": "flex",
    "padding": "0 24px",
    "borderBottom": "1px solid var(--color-slate-200)",
    "backgroundColor": "var(--color-slate-50)"
  },
  "modalTabBtn": {
    "padding": "10px 16px",
    "background": "none",
    "border": "none",
    "borderBottom": "2px solid transparent",
    "fontSize": "13px",
    "fontWeight": "600",
    "color": "var(--color-slate-500)",
    "cursor": "pointer"
  },
  "modalTabBtnActive": {
    "color": "var(--color-primary)",
    "borderBottomColor": "var(--color-primary)"
  },
  "modalBody": {
    "padding": "20px 24px",
    "overflowY": "auto",
    "maxHeight": "calc(85vh - 160px)"
  },
  "recordFieldRow": {
    "display": "grid",
    "gridTemplateColumns": "180px 1fr",
    "gap": "12px",
    "padding": "8px 0",
    "borderBottom": "1px solid var(--color-slate-100)",
    "fontSize": "13px"
  },
  "recordFieldKey": {
    "fontWeight": "600",
    "color": "var(--color-slate-600)"
  },
  "recordFieldVal": {
    "color": "var(--color-slate-900)",
    "wordBreak": "break-word"
  },
  "jsonBlock": {
    "margin": 0,
    "padding": "14px",
    "backgroundColor": "var(--color-slate-900)",
    "color": "#38bdf8",
    "borderRadius": "8px",
    "fontSize": "12px",
    "overflowX": "auto",
    "fontFamily": "monospace"
  },
  "modalFooter": {
    "display": "flex",
    "justifyContent": "space-between",
    "alignItems": "center",
    "padding": "14px 24px",
    "borderTop": "1px solid var(--color-slate-200)",
    "backgroundColor": "var(--color-slate-50)"
  },
  "copyBtn": {
    "display": "flex",
    "alignItems": "center",
    "gap": "6px",
    "padding": "8px 14px",
    "backgroundColor": "var(--color-white)",
    "border": "1px solid var(--color-slate-300)",
    "borderRadius": "8px",
    "fontSize": "13px",
    "fontWeight": "600",
    "color": "var(--color-slate-700)",
    "cursor": "pointer"
  },
  "closeBtn": {
    "padding": "8px 16px",
    "backgroundColor": "var(--color-primary)",
    "border": "none",
    "borderRadius": "8px",
    "fontSize": "13px",
    "fontWeight": "600",
    "color": "var(--color-white)",
    "cursor": "pointer"
  },
  "actionEditBtn": {
    "display": "flex",
    "alignItems": "center",
    "gap": "6px",
    "padding": "8px 14px",
    "backgroundColor": "var(--color-primary-subtle)",
    "border": "1px solid var(--color-primary-border-mid)",
    "borderRadius": "8px",
    "fontSize": "13px",
    "fontWeight": "600",
    "color": "var(--color-primary-hover)",
    "cursor": "pointer"
  },
  "actionDeleteBtn": {
    "display": "flex",
    "alignItems": "center",
    "gap": "6px",
    "padding": "8px 14px",
    "backgroundColor": "var(--color-danger-bg)",
    "border": "1px solid #fecaca",
    "borderRadius": "8px",
    "fontSize": "13px",
    "fontWeight": "600",
    "color": "var(--color-danger-dark)",
    "cursor": "pointer"
  },
  "editSectionTitle": {
    "fontSize": "12px",
    "fontWeight": "700",
    "color": "var(--color-slate-500)",
    "textTransform": "uppercase",
    "letterSpacing": "0.5px",
    "marginBottom": "10px",
    "paddingBottom": "4px",
    "borderBottom": "1px solid var(--color-slate-100)"
  },
  "editGrid": {
    "display": "grid",
    "gridTemplateColumns": "1fr 1fr",
    "gap": "12px"
  },
  "fieldLabel": {
    "display": "block",
    "fontSize": "12px",
    "fontWeight": "600",
    "color": "var(--color-slate-700)",
    "marginBottom": "4px"
  },
  "editInput": {
    "width": "100%",
    "padding": "8px 12px",
    "borderRadius": "6px",
    "border": "1px solid var(--color-slate-300)",
    "fontSize": "13px",
    "color": "var(--color-slate-900)",
    "backgroundColor": "var(--color-white)",
    "outline": "none",
    "boxSizing": "border-box"
  },
  "editSelect": {
    "width": "100%",
    "padding": "8px 12px",
    "borderRadius": "6px",
    "border": "1px solid var(--color-slate-300)",
    "fontSize": "13px",
    "color": "var(--color-slate-900)",
    "backgroundColor": "var(--color-white)",
    "outline": "none",
    "boxSizing": "border-box"
  },
  "cancelBtn": {
    "padding": "8px 16px",
    "backgroundColor": "var(--color-white)",
    "border": "1px solid var(--color-slate-300)",
    "borderRadius": "8px",
    "fontSize": "13px",
    "fontWeight": "600",
    "color": "var(--color-slate-600)",
    "cursor": "pointer"
  },
  "saveBtn": {
    "padding": "8px 18px",
    "backgroundColor": "var(--color-primary)",
    "border": "none",
    "borderRadius": "8px",
    "fontSize": "13px",
    "fontWeight": "600",
    "color": "var(--color-white)",
    "cursor": "pointer"
  },
  "dangerDeleteBtn": {
    "padding": "8px 18px",
    "backgroundColor": "var(--color-danger-dark)",
    "border": "none",
    "borderRadius": "8px",
    "fontSize": "13px",
    "fontWeight": "600",
    "color": "var(--color-white)",
    "cursor": "pointer"
  },
  "errorAlertBox": {
    "display": "flex",
    "alignItems": "center",
    "gap": "8px",
    "padding": "10px 14px",
    "backgroundColor": "var(--color-danger-bg)",
    "color": "#b91c1c",
    "borderRadius": "6px",
    "fontSize": "12px",
    "marginBottom": "16px",
    "border": "1px solid #fca5a5"
  }
}
