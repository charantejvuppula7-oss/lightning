import { prepareRecordForm, serializeRecordForm } from '../recordForm.js'
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import { SearchBar } from "../../../shared/components/SearchControls.jsx";
import MonitoringHeader from '../components/MonitoringHeader.jsx'
import { adminFetch as fetch } from "../api/monitoringApi.js";
import MonitoringLayout from "../components/MonitoringLayout.jsx";

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
    <MonitoringLayout user={user}>

      {/* Admin Sidebar */}

      {/* Main Container */}
      <div className="flex-1! flex! flex-col! min-w-0! h-screen! overflow-y-auto!">
        {/* Top Header */}
        <MonitoringHeader user={user} title="Database UI Explorer" subtitle="Live schema introspection & direct model data viewer" icon="database" actions={<><button
              type="button"
              onClick={() => {
                fetchTables();
                fetchTableData();
              }}
              className="flex! items-center! gap-[6px]! p-[8px_14px]! [background-color:var(--color-white)]! [border:1px_solid_var(--color-slate-300)]! rounded-[8px]! text-[13px]! font-semibold! [color:var(--color-slate-600)]! cursor-pointer!"
            >
              <span className={"material-symbols-outlined" + " " + "text-[18px]!"} >
                refresh
              </span>
              Refresh
            </button></>} />

        {feedback && <div role="status" className="p-[8px_32px]!">{feedback}</div>}
        {/* Workspace: 2-Column (Left: Tables Navigation, Right: Table Data Grid) */}
        <div className="p-[24px_32px]! flex-1!">
          <div className="grid! grid-cols-[280px_1fr]! gap-[24px]! items-start!">
            {/* Left Column: Tables List */}
            <div className="flex! flex-col!">
              <div className="[background-color:var(--color-white)]! [border:1px_solid_var(--color-slate-200)]! rounded-[12px]! overflow-hidden! [box-shadow:0_1px_3px_rgba(0,_0,_0,_0.04)]!">
                <div className="flex! justify-between! items-center! p-[14px_16px]! [border-bottom:1px_solid_var(--color-slate-200)]! [background-color:var(--color-slate-50)]!">
                  <span className="font-bold! text-[13px]! [color:var(--color-slate-900)]!">Database Tables</span>
                  <span className="text-[11px]! font-semibold! [background-color:var(--color-slate-200)]! [color:var(--color-slate-600)]! p-[2px_8px]! rounded-[10px]!">{tables.length} models</span>
                </div>

                <div className="p-[12px]! max-h-[calc(100vh_-_180px)]! overflow-y-auto!">
                  {tablesLoading ? (
                    <div className="p-[24px]! text-center!">
                      <span className="spinner" />
                    </div>
                  ) : (
                    Object.entries(categorizedTables).map(([category, catTables]) => (
                      <div key={category} className="mb-[16px]!">
                        <div className="text-[11px]! font-bold! [color:var(--color-slate-400)]! [text-transform:uppercase]! tracking-[0.06em]! p-[4px_8px]!">{category}</div>
                        <div className="flex! flex-col! gap-[3px]!">
                          {catTables.map((tbl) => {
                            const isSelected = tbl.table_key === activeTableKey;
                            return (
                              <div
                                key={tbl.table_key}
                                className={`tbl-nav-item ${isSelected ? "active" : ""}` + " " + "flex! items-center! gap-[8px]! p-[8px_10px]! rounded-[6px]! text-[13px]!"}
                                onClick={() => handleSelectTable(tbl.table_key)}
                                style={{
  backgroundColor: isSelected ? "var(--color-primary-subtle)" : "transparent",
  color: isSelected ? "var(--color-primary)" : "var(--color-slate-700)",
  fontWeight: isSelected ? "600" : "500"
}}
                              >
                                <span
                                  className={"material-symbols-outlined" + " " + "text-[18px]!"}
                                  style={{
  color: isSelected ? "var(--color-primary)" : "var(--color-slate-500)"
}}
                                >
                                  {tbl.icon || "table_chart"}
                                </span>
                                <span className="flex-1! min-w-0! overflow-hidden! text-ellipsis! whitespace-nowrap!">
                                  {tbl.display_name}
                                </span>
                                <span className="text-[11px]! font-semibold! [background-color:var(--color-slate-100)]! [color:var(--color-slate-500)]! p-[1px_6px]! rounded-[8px]!">{tbl.row_count}</span>
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
            <div className="flex! flex-col! gap-[16px]! min-w-0!">
              {/* Table Meta & Search Toolbar */}
              <div className="flex! justify-between! items-center! gap-[16px]! flex-wrap!">
                <div className="flex! items-center! gap-[10px]!">
                  <h2 className="text-[18px]! font-bold! [color:var(--color-slate-900)]! m-0!">{tableData.display_name}</h2>
                  <span className="text-[12px]! [color:var(--color-slate-500)]! [background-color:var(--color-slate-100)]! p-[2px_8px]! rounded-[10px]!">
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
                  wrapperClassName="[position:relative]! [width:320px]!"
                  iconClassName="[position:absolute]! [left:10px]! [top:50%]! [transform:translateY(-50%)]! [color:var(--color-slate-400)]! [font-size:18px]!"
                  inputClassName="[width:100%]! [height:36px]! [padding-left:34px]! [padding-right:10px]! [background-color:var(--color-white)]! [border:1px_solid_var(--color-slate-300)]! [border-radius:8px]! [font-size:13px]! [color:var(--color-slate-900)]! [outline:none]!"
                />
              </div>

              {/* Data Table Card */}
              <div className="[background-color:var(--color-white)]! [border:1px_solid_var(--color-slate-200)]! rounded-[12px]! overflow-hidden! [box-shadow:0_1px_3px_rgba(0,_0,_0,_0.04)]!">
                <div className="overflow-x-auto! max-h-[calc(100vh_-_250px)]!">
                  <table className="w-full! [border-collapse:collapse]! text-[12px]! text-left!">
                    <thead>
                      <tr>
                        <th className="p-[10px_14px]! [background-color:var(--color-slate-50)]! [color:var(--color-slate-600)]! font-semibold! text-[11px]! [border-bottom:1px_solid_var(--color-slate-200)]! whitespace-nowrap! sticky! top-[0]! z-[10]! w-[60px]! text-center!">#</th>
                        {tableData.columns.map((col) => (
                          <th
                            key={col.name}
                            onClick={() => handleSort(col.name)}
                            className="p-[10px_14px]! [background-color:var(--color-slate-50)]! [color:var(--color-slate-600)]! font-semibold! text-[11px]! [border-bottom:1px_solid_var(--color-slate-200)]! whitespace-nowrap! sticky! top-[0]! z-[10]! cursor-pointer!"
                            title={`Sort by ${col.name} (${col.type})`}
                          >
                            <div className="flex! items-center! gap-[4px]!">
                              <span>{col.name}</span>
                              <span className="text-[10px]! [color:var(--color-slate-400)]! font-normal!">
                                ({col.type.replace("Field", "")})
                              </span>
                              {sortField === col.name && (
                                <span className={"material-symbols-outlined" + " " + "text-[14px]! [color:var(--color-primary)]!"} >
                                  {sortDir === "asc" ? "arrow_upward" : "arrow_downward"}
                                </span>
                              )}
                            </div>
                          </th>
                        ))}
                        <th className="p-[10px_14px]! [background-color:var(--color-slate-50)]! [color:var(--color-slate-600)]! font-semibold! text-[11px]! [border-bottom:1px_solid_var(--color-slate-200)]! whitespace-nowrap! sticky! top-[0]! z-[10]! w-[110px]! text-center!">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dataLoading ? (
                        <tr>
                          <td colSpan={tableData.columns.length + 2} className="p-[40px]! text-center! [color:var(--color-slate-500)]!">
                            <div className="flex! flex-col! items-center! gap-[10px]!">
                              <span className="spinner" />
                              <span className="[color:var(--color-slate-500)]!">Loading {tableData.display_name} records...</span>
                            </div>
                          </td>
                        </tr>
                      ) : tableData.rows.length === 0 ? (
                        <tr>
                          <td colSpan={tableData.columns.length + 2} className="p-[32px]! text-center! [color:var(--color-slate-500)]!">
                            No records found in this table.
                          </td>
                        </tr>
                      ) : (
                        tableData.rows.map((row, idx) => (
                          <tr key={row.id || idx} className={"db-row" + " " + "[border-bottom:1px_solid_var(--color-slate-100)]! [transition:background-color_0.12s_ease]!"} >
                            <td className="p-[10px_14px]! [color:var(--color-slate-400)]! [vertical-align:middle]! whitespace-nowrap! max-w-[280px]! overflow-hidden! text-ellipsis! text-center! text-[11px]!">
                              {(tableData.pagination.page - 1) * tableData.pagination.page_size + idx + 1}
                            </td>
                            {tableData.columns.map((col) => {
                              const val = row[col.name];
                              let displayVal = val;
                              if (val === null || val === undefined) {
                                displayVal = <span className="[color:var(--color-slate-300)]!">NULL</span>;
                              } else if (typeof val === "boolean") {
                                displayVal = (
                                  <span
                                    className="text-[11px]! p-[1px_6px]! rounded-[4px]! font-semibold!" style={{
  backgroundColor: val ? "var(--color-success-bg)" : "var(--color-danger-border)",
  color: val ? "var(--color-success-dark)" : "#b91c1c"
}}
                                  >
                                    {val ? "TRUE" : "FALSE"}
                                  </span>
                                );
                              } else if (typeof val === "object") {
                                displayVal = <span className="[font-family:monospace]! text-[11px]! [color:#7c3aed]!">{JSON.stringify(val).slice(0, 30)}...</span>;
                              } else if (String(val).length > 40) {
                                displayVal = `${String(val).slice(0, 40)}…`;
                              }

                              return (
                                <td key={col.name} className="p-[10px_14px]! [color:var(--color-slate-800)]! [vertical-align:middle]! whitespace-nowrap! max-w-[280px]! overflow-hidden! text-ellipsis!" title={String(val)}>
                                  {displayVal}
                                </td>
                              );
                            })}
                            <td className="p-[10px_14px]! [color:var(--color-slate-800)]! [vertical-align:middle]! whitespace-nowrap! max-w-[280px]! overflow-hidden! text-ellipsis! text-center!">
                              <div className="flex! items-center! justify-center! gap-[6px]!">
                                <button
                                  type="button"
                                  onClick={() => handleInspect(row)}
                                  className="[background:none]! border-0! [color:var(--color-slate-500)]! cursor-pointer! p-[4px]! rounded-[4px]! inline-flex! items-center! justify-center! [transition:color_0.15s_ease]!"
                                  title="Inspect Details"
                                >
                                  <span className={"material-symbols-outlined" + " " + "text-[16px]!"} >
                                    visibility
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(row)}
                                  className="[background:none]! border-0! [color:var(--color-primary)]! cursor-pointer! p-[4px]! rounded-[4px]! inline-flex! items-center! justify-center! [transition:color_0.15s_ease]!"
                                  title="Edit Record"
                                >
                                  <span className={"material-symbols-outlined" + " " + "text-[16px]!"} >
                                    edit
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenDelete(row)}
                                  className="[background:none]! border-0! [color:var(--color-danger)]! cursor-pointer! p-[4px]! rounded-[4px]! inline-flex! items-center! justify-center! [transition:color_0.15s_ease]!"
                                  title="Delete Record"
                                >
                                  <span className={"material-symbols-outlined" + " " + "text-[16px]!"} >
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
                  <div className="flex! justify-between! items-center! p-[12px_18px]! [border-top:1px_solid_var(--color-slate-100)]!">
                    <span className="text-[12px]! [color:var(--color-slate-500)]!">
                      Showing page {tableData.pagination.page} of {tableData.pagination.total_pages} ({tableData.pagination.total_count} total records)
                    </span>
                    <div className="flex! gap-[8px]!">
                      <button
                        type="button"
                        disabled={tableData.pagination.page <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="p-[6px_12px]! [background-color:var(--color-white)]! [border:1px_solid_var(--color-slate-300)]! rounded-[6px]! text-[12px]! font-semibold! [color:var(--color-slate-700)]! cursor-pointer!"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={tableData.pagination.page >= tableData.pagination.total_pages}
                        onClick={() => setCurrentPage((p) => p + 1)}
                        className="p-[6px_12px]! [background-color:var(--color-white)]! [border:1px_solid_var(--color-slate-300)]! rounded-[6px]! text-[12px]! font-semibold! [color:var(--color-slate-700)]! cursor-pointer!"
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
        <div className="fixed! [inset:0]! [background-color:rgba(15,_23,_42,_0.45)]! [backdrop-filter:blur(4px)]! flex! items-center! justify-center! z-[1000]!" onClick={() => setIsModalOpen(false)}>
          <div className="w-[680px]! max-w-[92vw]! max-h-[85vh]! [background-color:var(--color-white)]! rounded-[14px]! [box-shadow:0_20px_25px_-5px_rgba(0,_0,_0,_0.1)]! flex! flex-col! overflow-hidden!" onClick={(e) => e.stopPropagation()}>
            <div className="flex! justify-between! items-center! p-[18px_24px]! [border-bottom:1px_solid_var(--color-slate-200)]!">
              <div className="flex! items-center! gap-[10px]!">
                <span className={"material-symbols-outlined" + " " + "text-[20px]! [color:var(--color-primary)]!"} >
                  database
                </span>
                <h3 className="text-[16px]! font-bold! [color:var(--color-slate-900)]! m-0!">
                  Record Details: {currentTableMeta.display_name || activeTableKey}
                </h3>
              </div>
              <button
                type="button"
                className="[background:none]! border-0! cursor-pointer! text-[16px]! [color:var(--color-slate-400)]!"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex! p-[0_24px]! [border-bottom:1px_solid_var(--color-slate-200)]! [background-color:var(--color-slate-50)]!">
              <button
                type="button"
                className={modalTab === "formatted" ? "[padding:10px_16px]! [background:none]! [border:none]! [border-bottom:2px_solid_transparent]! [font-size:13px]! [font-weight:600]! [color:var(--color-primary)]! [cursor:pointer]! [border-bottom-color:var(--color-primary)]!" : "[padding:10px_16px]! [background:none]! [border:none]! [border-bottom:2px_solid_transparent]! [font-size:13px]! [font-weight:600]! [color:var(--color-slate-500)]! [cursor:pointer]!"}
                onClick={() => setModalTab("formatted")}
              >
                Key-Value Fields
              </button>
              <button
                type="button"
                className={modalTab === "json" ? "[padding:10px_16px]! [background:none]! [border:none]! [border-bottom:2px_solid_transparent]! [font-size:13px]! [font-weight:600]! [color:var(--color-primary)]! [cursor:pointer]! [border-bottom-color:var(--color-primary)]!" : "[padding:10px_16px]! [background:none]! [border:none]! [border-bottom:2px_solid_transparent]! [font-size:13px]! [font-weight:600]! [color:var(--color-slate-500)]! [cursor:pointer]!"}
                onClick={() => setModalTab("json")}
              >
                Raw JSON
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-[20px_24px]! overflow-y-auto! max-h-[calc(85vh_-_160px)]!">
              {modalTab === "formatted" ? (
                <div className="flex! flex-col! gap-[8px]!">
                  {Object.entries(selectedRecord).map(([key, val]) => (
                    <div key={key} className="grid! grid-cols-[180px_1fr]! gap-[12px]! p-[8px_0]! [border-bottom:1px_solid_var(--color-slate-100)]! text-[13px]!">
                      <div className="font-semibold! [color:var(--color-slate-600)]!">{key}</div>
                      <div className="[color:var(--color-slate-900)]! [word-break:break-word]!">
                        {val === null || val === undefined ? (
                          <span className="[color:var(--color-slate-400)]!">NULL</span>
                        ) : typeof val === "object" ? (
                          <pre className="m-0! text-[11px]! [background-color:var(--color-slate-50)]! p-[6px]! rounded-[4px]!">
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
                <pre className="m-0! p-[14px]! [background-color:var(--color-slate-900)]! [color:#38bdf8]! rounded-[8px]! text-[12px]! overflow-x-auto! [font-family:monospace]!">
                  {JSON.stringify(selectedRecord, null, 2)}
                </pre>
              )}
            </div>

            <div className="flex! justify-between! items-center! p-[14px_24px]! [border-top:1px_solid_var(--color-slate-200)]! [background-color:var(--color-slate-50)]!">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(selectedRecord, null, 2));
                  toast.info("Record JSON copied to clipboard!");
                }}
                className="flex! items-center! gap-[6px]! p-[8px_14px]! [background-color:var(--color-white)]! [border:1px_solid_var(--color-slate-300)]! rounded-[8px]! text-[13px]! font-semibold! [color:var(--color-slate-700)]! cursor-pointer!"
              >
                <span className={"material-symbols-outlined" + " " + "text-[16px]!"} >
                  content_copy
                </span>
                Copy JSON
              </button>
              <div className="flex! gap-[8px]!">
                <button
                  type="button"
                  onClick={() => {
                    const rec = selectedRecord;
                    setIsModalOpen(false);
                    handleOpenEdit(rec);
                  }}
                  className="flex! items-center! gap-[6px]! p-[8px_14px]! [background-color:var(--color-primary-subtle)]! [border:1px_solid_var(--color-primary-border-mid)]! rounded-[8px]! text-[13px]! font-semibold! [color:var(--color-primary-hover)]! cursor-pointer!"
                >
                  <span className={"material-symbols-outlined" + " " + "text-[16px]!"} >
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
                  className="flex! items-center! gap-[6px]! p-[8px_14px]! [background-color:var(--color-danger-bg)]! [border:1px_solid_#fecaca]! rounded-[8px]! text-[13px]! font-semibold! [color:var(--color-danger-dark)]! cursor-pointer!"
                >
                  <span className={"material-symbols-outlined" + " " + "text-[16px]!"} >
                    delete
                  </span>
                  Delete Record
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-[8px_16px]! [background-color:var(--color-primary)]! border-0! rounded-[8px]! text-[13px]! font-semibold! [color:var(--color-white)]! cursor-pointer!"
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
        <div className="fixed! [inset:0]! [background-color:rgba(15,_23,_42,_0.45)]! [backdrop-filter:blur(4px)]! flex! items-center! justify-center! z-[1000]!" onClick={() => setIsEditModalOpen(false)}>
          <div className="w-[720px]! max-w-[92vw]! max-h-[85vh]! [background-color:var(--color-white)]! rounded-[14px]! [box-shadow:0_20px_25px_-5px_rgba(0,_0,_0,_0.1)]! flex! flex-col! overflow-hidden!" onClick={(e) => e.stopPropagation()}>
            <div className="flex! justify-between! items-center! p-[18px_24px]! [border-bottom:1px_solid_var(--color-slate-200)]!">
              <div className="flex! items-center! gap-[10px]!">
                <span className={"material-symbols-outlined" + " " + "text-[22px]! [color:var(--color-primary)]!"} >
                  edit_note
                </span>
                <div>
                  <h3 className="text-[16px]! font-bold! [color:var(--color-slate-900)]! m-0!">
                    Edit {currentTableMeta.display_name || activeTableKey} Record
                  </h3>
                  <span className="text-[11px]! [color:var(--color-slate-500)]!">
                    ID: {editingRecord.id || editingRecord.Id}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="[background:none]! border-0! cursor-pointer! text-[16px]! [color:var(--color-slate-400)]!"
                onClick={() => setIsEditModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex! flex-col! flex-1! overflow-hidden!">
              <div className="p-[20px_24px]! overflow-y-auto! max-h-[calc(85vh_-_160px)]!">
                {editError && (
                  <div className="flex! items-center! gap-[8px]! p-[10px_14px]! [background-color:var(--color-danger-bg)]! [color:#b91c1c]! rounded-[6px]! text-[12px]! mb-[16px]! [border:1px_solid_#fca5a5]!">
                    <span className={"material-symbols-outlined" + " " + "text-[16px]!"} >error</span>
                    {editError}
                  </div>
                )}

                {activeTableKey === "users" ? (
                  <div className="flex! flex-col! gap-[18px]!">
                    {/* Account Credentials */}
                    <div>
                      <div className="text-[12px]! font-bold! [color:var(--color-slate-500)]! [text-transform:uppercase]! tracking-[0.5px]! mb-[10px]! pb-[4px]! [border-bottom:1px_solid_var(--color-slate-100)]!">Account & Credentials</div>
                      <div className="grid! grid-cols-[1fr_1fr]! gap-[12px]!">
                        <div>
                          <label className="block! text-[12px]! font-semibold! [color:var(--color-slate-700)]! mb-[4px]!">Username *</label>
                          <input
                            type="text"
                            required
                            value={editFormData.user_name || ""}
                            onChange={(e) => handleEditChange("user_name", e.target.value)}
                            className="w-full! p-[8px_12px]! rounded-[6px]! [border:1px_solid_var(--color-slate-300)]! text-[13px]! [color:var(--color-slate-900)]! [background-color:var(--color-white)]! outline-none! box-border!"
                            placeholder="username"
                          />
                        </div>
                        <div>
                          <label className="block! text-[12px]! font-semibold! [color:var(--color-slate-700)]! mb-[4px]!">Email Address *</label>
                          <input
                            type="email"
                            required
                            value={editFormData.email || ""}
                            onChange={(e) => handleEditChange("email", e.target.value)}
                            className="w-full! p-[8px_12px]! rounded-[6px]! [border:1px_solid_var(--color-slate-300)]! text-[13px]! [color:var(--color-slate-900)]! [background-color:var(--color-white)]! outline-none! box-border!"
                            placeholder="user@example.com"
                          />
                        </div>
                        <div>
                          <label className="block! text-[12px]! font-semibold! [color:var(--color-slate-700)]! mb-[4px]!">Account Status</label>
                          <select
                            value={editFormData.account_status || "active"}
                            onChange={(e) => handleEditChange("account_status", e.target.value)}
                            className="w-full! p-[8px_12px]! rounded-[6px]! [border:1px_solid_var(--color-slate-300)]! text-[13px]! [color:var(--color-slate-900)]! [background-color:var(--color-white)]! outline-none! box-border!"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>
                        <div>
                          <label className="block! text-[12px]! font-semibold! [color:var(--color-slate-700)]! mb-[4px]!">Set New Password</label>
                          <input
                            type="password"
                            placeholder="Leave blank to keep unchanged"
                            value={editFormData.password || ""}
                            onChange={(e) => handleEditChange("password", e.target.value)}
                            className="w-full! p-[8px_12px]! rounded-[6px]! [border:1px_solid_var(--color-slate-300)]! text-[13px]! [color:var(--color-slate-900)]! [background-color:var(--color-white)]! outline-none! box-border!"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Profile Details */}
                    <div>
                      <div className="text-[12px]! font-bold! [color:var(--color-slate-500)]! [text-transform:uppercase]! tracking-[0.5px]! mb-[10px]! pb-[4px]! [border-bottom:1px_solid_var(--color-slate-100)]!">Personal Information</div>
                      <div className="grid! grid-cols-[1fr_1fr]! gap-[12px]!">
                        <div>
                          <label className="block! text-[12px]! font-semibold! [color:var(--color-slate-700)]! mb-[4px]!">First Name *</label>
                          <input
                            type="text"
                            required
                            value={editFormData.first_name || ""}
                            onChange={(e) => handleEditChange("first_name", e.target.value)}
                            className="w-full! p-[8px_12px]! rounded-[6px]! [border:1px_solid_var(--color-slate-300)]! text-[13px]! [color:var(--color-slate-900)]! [background-color:var(--color-white)]! outline-none! box-border!"
                          />
                        </div>
                        <div>
                          <label className="block! text-[12px]! font-semibold! [color:var(--color-slate-700)]! mb-[4px]!">Last Name *</label>
                          <input
                            type="text"
                            required
                            value={editFormData.last_name || ""}
                            onChange={(e) => handleEditChange("last_name", e.target.value)}
                            className="w-full! p-[8px_12px]! rounded-[6px]! [border:1px_solid_var(--color-slate-300)]! text-[13px]! [color:var(--color-slate-900)]! [background-color:var(--color-white)]! outline-none! box-border!"
                          />
                        </div>
                        <div>
                          <label className="block! text-[12px]! font-semibold! [color:var(--color-slate-700)]! mb-[4px]!">Employee ID *</label>
                          <input
                            type="text"
                            required
                            value={editFormData.employee_id || ""}
                            onChange={(e) => handleEditChange("employee_id", e.target.value)}
                            className="w-full! p-[8px_12px]! rounded-[6px]! [border:1px_solid_var(--color-slate-300)]! text-[13px]! [color:var(--color-slate-900)]! [background-color:var(--color-white)]! outline-none! box-border!"
                          />
                        </div>
                        <div>
                          <label className="block! text-[12px]! font-semibold! [color:var(--color-slate-700)]! mb-[4px]!">Phone Number</label>
                          <input
                            type="text"
                            value={editFormData.phone_number || ""}
                            onChange={(e) => handleEditChange("phone_number", e.target.value)}
                            className="w-full! p-[8px_12px]! rounded-[6px]! [border:1px_solid_var(--color-slate-300)]! text-[13px]! [color:var(--color-slate-900)]! [background-color:var(--color-white)]! outline-none! box-border!"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Role & Org */}
                    <div>
                      <div className="text-[12px]! font-bold! [color:var(--color-slate-500)]! [text-transform:uppercase]! tracking-[0.5px]! mb-[10px]! pb-[4px]! [border-bottom:1px_solid_var(--color-slate-100)]!">Organization & Role</div>
                      <div className="grid! grid-cols-[1fr_1fr]! gap-[12px]!">
                        <div>
                          <label className="block! text-[12px]! font-semibold! [color:var(--color-slate-700)]! mb-[4px]!">System Role</label>
                          <select
                            value={editFormData.role || editFormData.role_link || "developer"}
                            onChange={(e) => handleEditChange("role", e.target.value)}
                            className="w-full! p-[8px_12px]! rounded-[6px]! [border:1px_solid_var(--color-slate-300)]! text-[13px]! [color:var(--color-slate-900)]! [background-color:var(--color-white)]! outline-none! box-border!"
                          >
                            <option value="developer">Developer</option>
                            <option value="pm">Project Manager</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        <div>
                          <label className="block! text-[12px]! font-semibold! [color:var(--color-slate-700)]! mb-[4px]!">Designation</label>
                          <input
                            type="text"
                            value={editFormData.designation || ""}
                            onChange={(e) => handleEditChange("designation", e.target.value)}
                            className="w-full! p-[8px_12px]! rounded-[6px]! [border:1px_solid_var(--color-slate-300)]! text-[13px]! [color:var(--color-slate-900)]! [background-color:var(--color-white)]! outline-none! box-border!"
                          />
                        </div>
                        <div>
                          <label className="block! text-[12px]! font-semibold! [color:var(--color-slate-700)]! mb-[4px]!">Department</label>
                          <select
                            value={editFormData.department || editFormData.department_link || ""}
                            onChange={(e) => handleEditChange("department", e.target.value)}
                            className="w-full! p-[8px_12px]! rounded-[6px]! [border:1px_solid_var(--color-slate-300)]! text-[13px]! [color:var(--color-slate-900)]! [background-color:var(--color-white)]! outline-none! box-border!"
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
                          <label className="block! text-[12px]! font-semibold! [color:var(--color-slate-700)]! mb-[4px]!">Employment Type</label>
                          <select
                            value={editFormData.employment_type || "full_time"}
                            onChange={(e) => handleEditChange("employment_type", e.target.value)}
                            className="w-full! p-[8px_12px]! rounded-[6px]! [border:1px_solid_var(--color-slate-300)]! text-[13px]! [color:var(--color-slate-900)]! [background-color:var(--color-white)]! outline-none! box-border!"
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
                  <div className="grid! grid-cols-[1fr_1fr]! gap-[12px]!">
                    {tableData.columns
                      .filter((c) => !c.primary_key && !["created_at", "updated_at"].includes(c.name))
                      .map((col) => {
                        const val = editFormData[col.name];
                        const isBool = col.type && col.type.includes("Boolean");
                        return (
                          <div key={col.name}>
                            <label className="block! text-[12px]! font-semibold! [color:var(--color-slate-700)]! mb-[4px]!">{col.verbose_name || col.name}</label>
                            {isBool ? (
                              <select
                                value={String(val === true || val === "true")}
                                onChange={(e) => handleEditChange(col.name, e.target.value === "true")}
                                className="w-full! p-[8px_12px]! rounded-[6px]! [border:1px_solid_var(--color-slate-300)]! text-[13px]! [color:var(--color-slate-900)]! [background-color:var(--color-white)]! outline-none! box-border!"
                              >
                                <option value="true">True</option>
                                <option value="false">False</option>
                              </select>
                            ) : col.type === "JSONField" ? (
                              <textarea aria-label={col.verbose_name || col.name} rows={7} value={val ?? ''} onChange={e => handleEditChange(col.name, e.target.value)} className="w-full! p-[8px_12px]! rounded-[6px]! [border:1px_solid_var(--color-slate-300)]! text-[13px]! [color:var(--color-slate-900)]! [background-color:var(--color-white)]! outline-none! box-border! h-auto! [font-family:monospace]!" />
                            ) : (
                              <input
                                type={col.type === 'DateTimeField' ? 'datetime-local' : col.type === 'DateField' ? 'date' : 'text'}
                                value={val === null || val === undefined ? "" : String(val)}
                                onChange={(e) => handleEditChange(col.name, e.target.value)}
                                className="w-full! p-[8px_12px]! rounded-[6px]! [border:1px_solid_var(--color-slate-300)]! text-[13px]! [color:var(--color-slate-900)]! [background-color:var(--color-white)]! outline-none! box-border!"
                              />
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              <div className="flex! justify-between! items-center! p-[14px_24px]! [border-top:1px_solid_var(--color-slate-200)]! [background-color:var(--color-slate-50)]!">
                <button
                  type="button"
                  className="p-[8px_16px]! [background-color:var(--color-white)]! [border:1px_solid_var(--color-slate-300)]! rounded-[8px]! text-[13px]! font-semibold! [color:var(--color-slate-600)]! cursor-pointer!"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="p-[8px_18px]! [background-color:var(--color-primary)]! border-0! rounded-[8px]! text-[13px]! font-semibold! [color:var(--color-white)]! cursor-pointer!"
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
        <div className="fixed! [inset:0]! [background-color:rgba(15,_23,_42,_0.45)]! [backdrop-filter:blur(4px)]! flex! items-center! justify-center! z-[1000]!" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="w-[480px]! max-w-[92vw]! max-h-[85vh]! [background-color:var(--color-white)]! rounded-[14px]! [box-shadow:0_20px_25px_-5px_rgba(0,_0,_0,_0.1)]! flex! flex-col! overflow-hidden!" onClick={(e) => e.stopPropagation()}>
            <div className="flex! justify-between! items-center! p-[18px_24px]! [border-bottom:1px_solid_var(--color-danger-border)]! [background-color:var(--color-danger-bg)]!">
              <div className="flex! items-center! gap-[10px]!">
                <span className={"material-symbols-outlined" + " " + "text-[24px]! [color:var(--color-danger-dark)]!"} >
                  warning
                </span>
                <h3 className="text-[16px]! font-bold! [color:#991b1b]! m-0!">
                  Delete {currentTableMeta.display_name || activeTableKey} Record
                </h3>
              </div>
              <button
                type="button"
                className="[background:none]! border-0! cursor-pointer! text-[16px]! [color:var(--color-slate-400)]!"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="p-[20px_24px]!">
              <p className="text-[14px]! [color:var(--color-slate-700)]! leading-[1.6]! m-[0_0_16px_0]!">
                Are you sure you want to permanently delete this record from <strong>{currentTableMeta.display_name || activeTableKey}</strong>?
              </p>

              <div className="p-[12px_16px]! [background-color:var(--color-slate-50)]! [border:1px_solid_var(--color-slate-200)]! rounded-[8px]! text-[13px]! [color:var(--color-slate-900)]! mb-[16px]!">
                {activeTableKey === "users" ? (
                  <>
                    <div className="mb-[4px]!"><strong>Username:</strong> {deletingRecord.user_name}</div>
                    <div className="mb-[4px]!"><strong>Name:</strong> {deletingRecord.first_name} {deletingRecord.last_name}</div>
                    <div className="mb-[4px]!"><strong>Email:</strong> {deletingRecord.email}</div>
                    <div><strong>Role:</strong> {deletingRecord.role || deletingRecord.role_link || "developer"}</div>
                  </>
                ) : (
                  <>
                    <div className="mb-[4px]!"><strong>Record ID:</strong> {deletingRecord.id}</div>
                    {deletingRecord.name && <div className="mb-[4px]!"><strong>Name:</strong> {deletingRecord.name}</div>}
                    {deletingRecord.project_name && <div className="mb-[4px]!"><strong>Project:</strong> {deletingRecord.project_name}</div>}
                    {deletingRecord.Task_Name && <div><strong>Task:</strong> {deletingRecord.Task_Name}</div>}
                  </>
                )}
              </div>

              {deleteError && (
                <div className="flex! items-center! gap-[8px]! p-[10px_14px]! [background-color:var(--color-danger-bg)]! [color:#b91c1c]! rounded-[6px]! text-[12px]! mb-[16px]! [border:1px_solid_#fca5a5]!">
                  <span className={"material-symbols-outlined" + " " + "text-[16px]!"} >error</span>
                  {deleteError}
                </div>
              )}

              <div className="text-[12px]! [color:var(--color-danger-dark)]! font-semibold!">
                ⚠️ Warning: This action will permanently remove this record from the database.
              </div>
            </div>

            <div className="flex! justify-between! items-center! p-[14px_24px]! [border-top:1px_solid_var(--color-slate-200)]! [background-color:var(--color-slate-50)]!">
              <button
                type="button"
                className="p-[8px_16px]! [background-color:var(--color-white)]! [border:1px_solid_var(--color-slate-300)]! rounded-[8px]! text-[13px]! font-semibold! [color:var(--color-slate-600)]! cursor-pointer!"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="p-[8px_18px]! [background-color:var(--color-danger-dark)]! border-0! rounded-[8px]! text-[13px]! font-semibold! [color:var(--color-white)]! cursor-pointer!"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </MonitoringLayout>
  );
}
