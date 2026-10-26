import { useState, useEffect, useMemo, useRef, useCallback, useContext } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { SearchInput } from '../../components/common/SearchControls.jsx';
import { useFeedback } from '../../components/common/Feedback.jsx';
import { apiRequest, apiUpload, errorMessage } from '../../services/api/apiClient.js';
import { ProjectSelectionContext } from '../projects/projectSelectionContext.js';
import { hasSidebarPermission } from '../../layouts/sidebarNavigation.js';
import DocumentActionModals from './DocumentActionModals.jsx';

function downloadDocument(doc) {
  const link = document.createElement('a'); link.href = doc.fileUrl;
  link.download = doc.name; document.body.appendChild(link); link.click(); link.remove();
}
function getFileExtension(filename) {
  if (!filename) return "FILE";
  const parts = filename.split(".");
  if (parts.length < 2) return "FILE";
  return parts[parts.length - 1].toUpperCase();
}

function formatDate(isoString) {
  if (!isoString) return "";
  try {
    return new Date(isoString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return isoString;
  }
}

export default function DocumentsPage({ user }) {
  const { projects, selectedProjectId } = useContext(ProjectSelectionContext);
  const selectedProjectName = projects.find(project => project.id === selectedProjectId)?.project_name || '';
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const showHeader = true;
  const admin = ['Administrator', 'Admin'].includes(user.role);
  const canRename = admin || hasSidebarPermission(user.permissions, 'Documents', 'Edit');
  const canDelete = admin || hasSidebarPermission(user.permissions, 'Documents', 'Delete');
  const canUpload = admin || hasSidebarPermission(user.permissions, 'Documents', 'Create');
  const [uploading, setUploading] = useState(false);
  const { toast, feedback } = useFeedback();
  // ── Documents State ──────────────────────────────────────────────────
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  const [internalSearchQuery, setInternalSearchQuery] = useState(() => {
    return searchParams.get("search") || location.state?.searchDoc || "";
  });

  const activeSearch = internalSearchQuery;

  const [uploaderFilter, setUploaderFilter] = useState("Anyone");
  const [accessFilter, setAccessFilter] = useState("Access");
  const [isUploaderDropdownOpen, setIsUploaderDropdownOpen] = useState(false);
  const [isAccessDropdownOpen, setIsAccessDropdownOpen] = useState(false);

  const [activeMenuDocId, setActiveMenuDocId] = useState(null);
  const [renameModalDoc, setRenameModalDoc] = useState(null);
  const [deleteModalDoc, setDeleteModalDoc] = useState(null);

  const uploaderDropdownRef = useRef(null);
  const accessDropdownRef = useRef(null);

  // ── Pagination State ─────────────────────────────────────────────────
  const [requestedPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // ── Outside Click Listeners ──────────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        uploaderDropdownRef.current &&
        !uploaderDropdownRef.current.contains(e.target)
      ) {
        setIsUploaderDropdownOpen(false);
      }
      if (
        accessDropdownRef.current &&
        !accessDropdownRef.current.contains(e.target)
      ) {
        setIsAccessDropdownOpen(false);
      }
      if (
        !e.target.closest(".doc-actions-menu-btn") &&
        !e.target.closest(".doc-actions-dropdown")
      ) {
        setActiveMenuDocId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchDocuments = useCallback(async ({ signal } = {}) => {
    setLoading(true);
    try {
      const data = await apiRequest(`/documents/${selectedProjectId && selectedProjectId !== 'all' ? `?project_id=${selectedProjectId}` : ''}`, { signal });
      setDocuments(data.map(doc => ({ id: doc.id, name: doc.file_name,
        type: getFileExtension(doc.file_name), uploadedBy: doc.uploaded_by_name,
        uploadedById: doc.uploaded_by, date: formatDate(doc.uploaded_at),
        fileUrl: doc.file_url, projectId: doc.project, projectName: doc.project_name,
        access: canRename ? 'Can edit' : 'View Only' })));
      setSelectedIds([]);
    } catch (error) { if (!signal?.aborted) { toast.error(errorMessage(error)); setDocuments([]); } }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [selectedProjectId, canRename, toast]);
  // Synchronize the document list with the selected project.
  useEffect(() => {
    const controller = new AbortController();
    // Starting an external request also updates its loading indicator.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDocuments({ signal: controller.signal });
    return () => controller.abort();
  }, [fetchDocuments]);
  // ── Unique Uploaders for Filter Dropdown ──────────────────────────────
  const uploaders = useMemo(() => {
    const list = ["Anyone"];
    documents.forEach((doc) => {
      if (doc.uploadedBy && !list.includes(doc.uploadedBy)) {
        list.push(doc.uploadedBy);
      }
    });
    return list;
  }, [documents]);

  // ── Filtered Documents ───────────────────────────────────────────────
  const filteredDocs = useMemo(() => {
    const q = (activeSearch || "").trim().toLowerCase();
    const selProj = (selectedProjectId || "").trim().toLowerCase();
    const selName = (selectedProjectName || "").trim().toLowerCase();

    return documents.filter((doc) => {
      const matchesProj =
        !selProj ||
        selProj === "all" ||
        selProj === "all projects" ||
        (doc.projectId && String(doc.projectId).toLowerCase() === selProj) ||
        (doc.projectName && doc.projectName.toLowerCase() === selProj) ||
        (selName && selName !== "all projects" && doc.projectName && doc.projectName.toLowerCase() === selName);

      const matchesSearch =
        !q ||
        (doc.name || "").toLowerCase().includes(q) ||
        (doc.uploadedBy || "").toLowerCase().includes(q) ||
        (doc.type || "").toLowerCase().includes(q) ||
        (doc.projectName || "").toLowerCase().includes(q);

      const matchesUploader =
        uploaderFilter === "Anyone" || doc.uploadedBy === uploaderFilter;

      const matchesAccess =
        accessFilter === "Access" || doc.access === accessFilter;

      return matchesProj && matchesSearch && matchesUploader && matchesAccess;
    });
  }, [documents, selectedProjectId, selectedProjectName, activeSearch, uploaderFilter, accessFilter]);

  const currentPage = Math.max(1, Math.min(requestedPage, Math.ceil(filteredDocs.length / itemsPerPage)));

  // ── Pagination ───────────────────────────────────────────────────────
  const paginatedDocs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredDocs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredDocs, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / itemsPerPage));



  // ── Selection Handlers ───────────────────────────────────────────────
  const isAllPageSelected = useMemo(() => {
    if (paginatedDocs.length === 0) return false;
    return paginatedDocs.every((doc) => selectedIds.includes(doc.id));
  }, [paginatedDocs, selectedIds]);

  const handleSelectAllToggle = () => {
    if (isAllPageSelected) {
      const pageIds = paginatedDocs.map((doc) => doc.id);
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      const newSelections = [...selectedIds];
      paginatedDocs.forEach((doc) => {
        if (!newSelections.includes(doc.id)) newSelections.push(doc.id);
      });
      setSelectedIds(newSelections);
    }
  };

  const handleSelectToggle = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleClearFilters = () => {
    setInternalSearchQuery("");
    setUploaderFilter("Anyone");
    setAccessFilter("Access");
    setCurrentPage(1);
  };

  // ── Actions ──────────────────────────────────────────────────────────
  const handleDownloadSingle = (doc) => {
    downloadDocument(doc);
  };

  const handleDownloadSelected = () => {
    if (selectedIds.length === 0) return;
    const selectedDocs = documents.filter((d) => selectedIds.includes(d.id));
    selectedDocs.forEach((doc, idx) => {
      setTimeout(() => {
        downloadDocument(doc, { silent: true });
      }, idx * 250);
    });
    toast.success(`Downloading ${selectedDocs.length} selected document(s)`);
  };

  // ── Render Content (Table, Filters, Modals) ──────────────────────────
  const renderDocumentContent = () => (
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {feedback}
      {canUpload && selectedProjectId && <label style={{float:'right',cursor:'pointer',color:'var(--color-primary)',fontWeight:600}}>
        {uploading ? 'Uploading…' : '+ Upload document'}
        <input type="file" hidden disabled={uploading} onChange={async event => {
          const file = event.target.files[0]; if (!file) return;
          setUploading(true);
          const form = new FormData(); form.append('file', file); form.append('project', selectedProjectId);
          try { await apiUpload('/documents/', form); await fetchDocuments(); toast.success('Document uploaded.'); }
          catch (error) { toast.error(errorMessage(error)); }
          finally { setUploading(false); event.target.value = ''; }
        }} />
      </label>}
      {/* ── Page Header ── */}
      {showHeader && (
        <div style={{ marginBottom: "20px" }}>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: "800",
              color: "var(--color-slate-900)",
              margin: "0 0 6px 0",
              letterSpacing: "-0.3px",
            }}
          >
            Documents
          </h1>
          <p
            style={{
              fontSize: "13px",
              color: "var(--color-slate-500)",
              margin: 0,
              fontWeight: "400",
            }}
          >
            Access all project documents in one place.
          </p>
        </div>
      )}

      {/* ── Filter Controls Row ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        {/* Left Search Bar */}
        <div
          style={{
            position: "relative",
            width: "300px",
            maxWidth: "100%",
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "18px",
              color: "var(--color-slate-400)",
            }}
          >
            search
          </span>
          <SearchInput
            placeholder="Search document"
            value={activeSearch}
            onChange={(e) => {
              setInternalSearchQuery(e.target.value); setCurrentPage(1);
              setCurrentPage(1);
            }}
            style={{
              width: "100%",
              padding: "8px 12px 8px 34px",
              borderRadius: "8px",
              border: "1px solid var(--color-slate-200)",
              backgroundColor: "var(--color-white)",
              fontSize: "13px",
              color: "var(--color-slate-900)",
              outline: "none",
              boxSizing: "border-box",
              boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
            }}
          />
        </div>

        {/* Right Filters: Uploader + Access + Clear */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Uploader Filter Dropdown */}
          <div style={{ position: "relative" }} ref={uploaderDropdownRef}>
            <button
              type="button"
              onClick={() => setIsUploaderDropdownOpen(!isUploaderDropdownOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 14px",
                backgroundColor: "var(--color-white)",
                border: "1px solid var(--color-slate-200)",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "500",
                color: "var(--color-slate-700)",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
              }}
            >
              <span>{uploaderFilter}</span>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "16px", color: "var(--color-slate-500)" }}
              >
                keyboard_arrow_down
              </span>
            </button>

            {isUploaderDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  right: 0,
                  width: "180px",
                  backgroundColor: "var(--color-white)",
                  border: "1px solid var(--color-slate-200)",
                  borderRadius: "8px",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                  padding: "4px",
                  zIndex: 50,
                  maxHeight: "200px",
                  overflowY: "auto",
                }}
              >
                {uploaders.map((up) => (
                  <div
                    key={up}
                    onClick={() => {
                      setUploaderFilter(up);
                      setIsUploaderDropdownOpen(false);
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: "7px 10px",
                      fontSize: "13px",
                      color: uploaderFilter === up ? "var(--color-primary)" : "var(--color-slate-700)",
                      fontWeight: uploaderFilter === up ? "600" : "400",
                      backgroundColor: uploaderFilter === up ? "var(--color-primary-subtle)" : "transparent",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    {up}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Access Filter Dropdown */}
          <div style={{ position: "relative" }} ref={accessDropdownRef}>
            <button
              type="button"
              onClick={() => setIsAccessDropdownOpen(!isAccessDropdownOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 14px",
                backgroundColor: "var(--color-white)",
                border: "1px solid var(--color-slate-200)",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "500",
                color: "var(--color-slate-700)",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
              }}
            >
              <span>{accessFilter}</span>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "16px", color: "var(--color-slate-500)" }}
              >
                keyboard_arrow_down
              </span>
            </button>

            {isAccessDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  right: 0,
                  width: "150px",
                  backgroundColor: "var(--color-white)",
                  border: "1px solid var(--color-slate-200)",
                  borderRadius: "8px",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                  padding: "4px",
                  zIndex: 50,
                }}
              >
                {["Access", "Can edit", "View Only"].map((acc) => (
                  <div
                    key={acc}
                    onClick={() => {
                      setAccessFilter(acc);
                      setIsAccessDropdownOpen(false);
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: "7px 10px",
                      fontSize: "13px",
                      color: accessFilter === acc ? "var(--color-primary)" : "var(--color-slate-700)",
                      fontWeight: accessFilter === acc ? "600" : "400",
                      backgroundColor: accessFilter === acc ? "var(--color-primary-subtle)" : "transparent",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    {acc}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Clear Filters Button */}
          <button
            type="button"
            onClick={handleClearFilters}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-primary)",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              padding: "6px 8px",
            }}
          >
            clear
          </button>
        </div>
      </div>

      {/* ── Selection Action Toolbar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
          minHeight: "36px",
        }}
      >
        <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--color-slate-900)" }}>
          {selectedIds.length > 0 ? `${selectedIds.length} Selected` : ""}
        </div>

        {selectedIds.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={handleDownloadSelected}
              style={{
                padding: "6px 14px",
                backgroundColor: "var(--color-white)",
                border: "1px solid var(--color-slate-200)",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "600",
                color: "var(--color-slate-900)",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
              }}
            >
              Download
            </button>

            {/* Delete button (enabled only for Admin and PM) */}
            {canDelete && (
              <button
                type="button"
                onClick={() => {
                  const toDelete = documents.filter((d) => selectedIds.includes(d.id));
                  if (toDelete.length > 0) setDeleteModalDoc(toDelete);
                }}
                style={{
                  padding: "6px 14px",
                  backgroundColor: "var(--color-danger-bg)",
                  border: "1px solid #FECACA",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "var(--color-danger-dark)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                  delete
                </span>
                Delete ({selectedIds.length})
              </button>
            )}

            <button
              type="button"
              onClick={handleClearSelection}
              style={{
                padding: "6px 14px",
                backgroundColor: "var(--color-white)",
                border: "1px solid var(--color-slate-200)",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "600",
                color: "var(--color-slate-900)",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
              }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* ── Documents Table Card ── */}
      <div
        style={{
          backgroundColor: "var(--color-white)",
          borderRadius: "12px",
          border: "1px solid var(--color-slate-200)",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
          overflowX: "auto",
          width: "100%",
        }}
      >
        <div style={{ minWidth: "760px" }}>
          {/* Table Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "48px minmax(200px, 2.5fr) minmax(70px, 0.9fr) minmax(130px, 1.4fr) minmax(100px, 1.1fr) minmax(95px, 1fr) 70px",
              backgroundColor: "#EEF2FF",
              padding: "12px 16px",
              borderBottom: "1px solid var(--color-slate-200)",
              alignItems: "center",
              fontSize: "13px",
              fontWeight: "600",
              color: "var(--color-slate-600)",
              borderTopLeftRadius: "12px",
              borderTopRightRadius: "12px",
            }}
          >
            <div>
              <input
                type="checkbox"
                className="pm-doc-checkbox"
                checked={isAllPageSelected}
                onChange={handleSelectAllToggle}
                aria-label="Select all on this page"
              />
            </div>
            <div style={{ minWidth: 0 }}>Document name</div>
            <div style={{ minWidth: 0 }}>Type</div>
            <div style={{ minWidth: 0 }}>Uploaded by</div>
            <div style={{ minWidth: 0 }}>Date</div>
            <div style={{ minWidth: 0 }}>Access</div>
            <div style={{ textAlign: "right", paddingRight: "8px", minWidth: 0 }}>Action</div>
          </div>

          {/* Table Body */}
          {loading ? (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                color: "var(--color-slate-400)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "32px", animation: "spin 1s linear infinite" }}
              >
                progress_activity
              </span>
              <span style={{ fontSize: "13px" }}>Loading project documents...</span>
            </div>
          ) : paginatedDocs.length === 0 ? (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                color: "var(--color-slate-400)",
                fontSize: "14px",
              }}
            >
              No documents found matching your criteria.
            </div>
          ) : (
            paginatedDocs.map((doc, idx) => {
              const isSelected = selectedIds.includes(doc.id);
              const isMenuOpen = activeMenuDocId === doc.id;

              return (
                <div
                  key={doc.id || idx}
                  className="pm-doc-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "48px minmax(200px, 2.5fr) minmax(70px, 0.9fr) minmax(130px, 1.4fr) minmax(100px, 1.1fr) minmax(95px, 1fr) 70px",
                    padding: "14px 16px",
                    borderBottom:
                      idx === paginatedDocs.length - 1 ? "none" : "1px solid var(--color-slate-100)",
                    alignItems: "center",
                    fontSize: "13px",
                    color: "var(--color-slate-700)",
                    backgroundColor: isSelected ? "#F0F7FF" : "var(--color-white)",
                    cursor: "pointer",
                  }}
                  onClick={() => handleSelectToggle(doc.id)}
                >
                  {/* Checkbox */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="pm-doc-checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectToggle(doc.id)}
                      aria-label={`Select ${doc.name}`}
                    />
                  </div>

                  {/* Document Name */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      overflow: "hidden",
                      minWidth: 0,
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: "20px",
                        flexShrink: 0,
                        color:
                          doc.type === "PDF"
                            ? "var(--color-danger)"
                            : doc.type === "DOCX" || doc.type === "DOC"
                            ? "var(--color-primary)"
                            : doc.type === "XLSX" || doc.type === "XLS"
                            ? "var(--color-success)"
                            : doc.type === "PNG" || doc.type === "JPG" || doc.type === "JPEG"
                            ? "#8B5CF6"
                            : "var(--color-slate-500)",
                      }}
                    >
                      description
                    </span>
                    <div style={{ overflow: "hidden", minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: "600",
                          color: "var(--color-slate-900)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={doc.name}
                      >
                        {doc.name}
                      </div>
                      {doc.projectName && (
                        <div
                          style={{
                            fontSize: "11px",
                            color: "var(--color-slate-400)",
                            marginTop: "2px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {doc.projectName}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Type */}
                  <div style={{ color: "var(--color-slate-500)", fontWeight: "500", minWidth: 0 }}>
                    {doc.type}
                  </div>

                  {/* Uploaded By */}
                  <div
                    style={{
                      color: "var(--color-slate-700)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      minWidth: 0,
                    }}
                    title={doc.uploadedBy}
                  >
                    {doc.uploadedBy}
                  </div>

                  {/* Date */}
                  <div style={{ color: "var(--color-slate-500)", whiteSpace: "nowrap", minWidth: 0 }}>
                    {doc.date}
                  </div>

                  {/* Access */}
                  <div style={{ minWidth: 0 }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "3px 9px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "600",
                        letterSpacing: "0.2px",
                        whiteSpace: "nowrap",
                        backgroundColor: doc.access === "Can edit" ? "var(--color-success-bg)" : "var(--color-slate-100)",
                        color: doc.access === "Can edit" ? "var(--color-success-dark)" : "var(--color-slate-600)",
                        border: doc.access === "Can edit" ? "1px solid #BBF7D0" : "1px solid var(--color-slate-200)",
                        boxSizing: "border-box",
                        height: "22px",
                      }}
                    >
                      {doc.access}
                    </span>
                  </div>

                  {/* Action Menu Column */}
                  <div
                    style={{ textAlign: "right", position: "relative", minWidth: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                  <button
                    type="button"
                    className="doc-actions-menu-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuDocId(isMenuOpen ? null : doc.id);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-slate-500)",
                      cursor: "pointer",
                      padding: "4px",
                      borderRadius: "4px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    aria-label="Actions menu"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                      more_horiz
                    </span>
                  </button>

                  {/* Actions Dropdown */}
                  {isMenuOpen && (
                    <div
                      className="doc-actions-dropdown"
                      style={{
                        position: "absolute",
                        right: 0,
                        top: "calc(100% + 2px)",
                        backgroundColor: "var(--color-white)",
                        border: "1px solid var(--color-slate-200)",
                        borderRadius: "8px",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                        zIndex: 100,
                        width: "130px",
                        padding: "4px",
                      }}
                    >
                      {/* Download Option */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadSingle(doc);
                          setActiveMenuDocId(null);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px 12px",
                          fontSize: "13px",
                          fontWeight: "500",
                          color: "var(--color-slate-800)",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "background-color 0.12s",
                          borderRadius: "4px",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = "var(--color-slate-50)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor = "transparent")
                        }
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: "16px", color: "var(--color-slate-500)" }}
                        >
                          download
                        </span>
                        Download
                      </div>

                      {/* Rename Option (enabled only for Admin and PM) */}
                      {canRename && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameModalDoc(doc);
                            setActiveMenuDocId(null);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "8px 12px",
                            fontSize: "13px",
                            fontWeight: "500",
                            color: "var(--color-slate-800)",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "background-color 0.12s",
                            borderRadius: "4px",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = "var(--color-slate-50)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor = "transparent")
                          }
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: "16px", color: "var(--color-slate-500)" }}
                          >
                            edit
                          </span>
                          Rename
                        </div>
                      )}

                      {/* Delete Option (enabled only for Admin and PM) */}
                      {canDelete && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModalDoc(doc);
                            setActiveMenuDocId(null);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "8px 12px",
                            fontSize: "13px",
                            fontWeight: "500",
                            color: "var(--color-danger)",
                            cursor: "pointer",
                            textAlign: "left",
                            borderTop: canRename ? "1px solid var(--color-slate-100)" : "none",
                            transition: "background-color 0.12s",
                            borderRadius: "4px",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = "var(--color-danger-bg)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor = "transparent")
                          }
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: "16px", color: "var(--color-danger)" }}
                          >
                            delete
                          </span>
                          Delete
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        </div>
      </div>

      {/* ── Pagination Footer ── */}
      {!loading && filteredDocs.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "16px",
            padding: "0 4px",
          }}
        >
          <div style={{ fontSize: "12px", color: "var(--color-slate-400)" }}>
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, filteredDocs.length)} of{" "}
            {filteredDocs.length} documents
          </div>

          {/* Page Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                border: "1px solid var(--color-slate-200)",
                backgroundColor: "var(--color-white)",
                color: currentPage === 1 ? "var(--color-slate-300)" : "var(--color-slate-600)",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                chevron_left
              </span>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
              const isActive = currentPage === pageNum;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    border: isActive ? "none" : "1px solid var(--color-slate-200)",
                    backgroundColor: isActive ? "var(--color-primary)" : "var(--color-white)",
                    color: isActive ? "var(--color-white)" : "var(--color-slate-600)",
                    fontSize: "12px",
                    fontWeight: isActive ? "700" : "500",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                border: "1px solid var(--color-slate-200)",
                backgroundColor: "var(--color-white)",
                color: currentPage === totalPages ? "var(--color-slate-300)" : "var(--color-slate-600)",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                chevron_right
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ── Document Actions Modals (Rename & Delete) ── */}
      {(canRename || canDelete) && (
        <DocumentActionModals key={renameModalDoc?.id || "actions"} toast={toast}
          renameDoc={renameModalDoc}
          onCloseRename={() => setRenameModalDoc(null)}
          onRenameSuccess={(docId, newName) => {
            setDocuments((prev) =>
              prev.map((d) =>
                d.id === docId
                  ? { ...d, name: newName, type: getFileExtension(newName) }
                  : d
              )
            );
          }}
          deleteDoc={deleteModalDoc}
          onCloseDelete={() => setDeleteModalDoc(null)}
          onDeleteSuccess={(deletedIdOrIds) => {
            const idsToDelete = Array.isArray(deletedIdOrIds)
              ? deletedIdOrIds
              : [deletedIdOrIds];
            setDocuments((prev) => prev.filter((d) => !idsToDelete.includes(d.id)));
            setSelectedIds((prev) => prev.filter((id) => !idsToDelete.includes(id)));
          }}
        />
      )}
    </div>
  );

  return <section style={{ padding: '24px 32px' }}>{renderDocumentContent()}</section>;
}
