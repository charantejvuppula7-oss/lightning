import { useState, useEffect, useMemo, useRef, useCallback, useContext } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { SearchInput } from '../../shared/components/SearchControls.jsx';
import { useFeedback } from '../../shared/components/Feedback.jsx';
import { apiRequest, apiUpload, errorMessage } from '../../shared/api/apiClient.js';
import { ProjectSelectionContext } from '../projects/projectSelectionContext.js';
import { hasSidebarPermission } from '../../layouts/Sidebar.jsx';
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
      className="w-full! box-border! [font-family:'Inter',_-apple-system,_BlinkMacSystemFont,_'Segoe_UI',_Roboto,_sans-serif]!"
    >
      {feedback}
      {canUpload && selectedProjectId && <label className="[float:right]! cursor-pointer! [color:var(--color-primary)]! font-semibold!">
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
        <div className="mb-[20px]!">
          <h1
            className="text-[24px]! font-extrabold! [color:var(--color-slate-900)]! m-[0_0_6px_0]! tracking-[-0.3px]!"
          >
            Documents
          </h1>
          <p
            className="text-[13px]! [color:var(--color-slate-500)]! m-0! font-normal!"
          >
            Access all project documents in one place.
          </p>
        </div>
      )}

      {/* ── Filter Controls Row ── */}
      <div
        className="flex! items-center! justify-between! flex-wrap! gap-[12px]! mb-[16px]!"
      >
        {/* Left Search Bar */}
        <div
          className="relative! w-[300px]! max-w-[100%]!"
        >
          <span
            className={"material-symbols-outlined" + " " + "absolute! left-[10px]! top-[50%]! [transform:translateY(-50%)]! text-[18px]! [color:var(--color-slate-400)]!"}

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
            controlClassName="[width:100%]! [padding:8px_12px_8px_34px]! [border-radius:8px]! [border:1px_solid_var(--color-slate-200)]! [background-color:var(--color-white)]! [font-size:13px]! [color:var(--color-slate-900)]! [outline:none]! [box-sizing:border-box]! [box-shadow:0_1px_2px_rgba(0,0,0,0.02)]!"
          />
        </div>

        {/* Right Filters: Uploader + Access + Clear */}
        <div className="flex! items-center! gap-[10px]! flex-wrap!">
          {/* Uploader Filter Dropdown */}
          <div className="relative!" ref={uploaderDropdownRef}>
            <button
              type="button"
              onClick={() => setIsUploaderDropdownOpen(!isUploaderDropdownOpen)}
              className="flex! items-center! gap-[6px]! p-[7px_14px]! [background-color:var(--color-white)]! [border:1px_solid_var(--color-slate-200)]! rounded-[8px]! text-[13px]! font-medium! [color:var(--color-slate-700)]! cursor-pointer! [box-shadow:0_1px_2px_rgba(0,0,0,0.02)]!"
            >
              <span>{uploaderFilter}</span>
              <span
                className={"material-symbols-outlined" + " " + "text-[16px]! [color:var(--color-slate-500)]!"}

              >
                keyboard_arrow_down
              </span>
            </button>

            {isUploaderDropdownOpen && (
              <div
                className="absolute! top-[calc(100%_+_4px)]! right-[0]! w-[180px]! [background-color:var(--color-white)]! [border:1px_solid_var(--color-slate-200)]! rounded-[8px]! [box-shadow:0_10px_25px_-5px_rgba(0,_0,_0,_0.1)]! p-[4px]! z-[50]! max-h-[200px]! overflow-y-auto!"
              >
                {uploaders.map((up) => (
                  <div
                    key={up}
                    onClick={() => {
                      setUploaderFilter(up);
                      setIsUploaderDropdownOpen(false);
                      setCurrentPage(1);
                    }}
                    className="p-[7px_10px]! text-[13px]! rounded-[6px]! cursor-pointer!" style={{
  color: uploaderFilter === up ? "var(--color-primary)" : "var(--color-slate-700)",
  fontWeight: uploaderFilter === up ? "600" : "400",
  backgroundColor: uploaderFilter === up ? "var(--color-primary-subtle)" : "transparent"
}}
                  >
                    {up}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Access Filter Dropdown */}
          <div className="relative!" ref={accessDropdownRef}>
            <button
              type="button"
              onClick={() => setIsAccessDropdownOpen(!isAccessDropdownOpen)}
              className="flex! items-center! gap-[6px]! p-[7px_14px]! [background-color:var(--color-white)]! [border:1px_solid_var(--color-slate-200)]! rounded-[8px]! text-[13px]! font-medium! [color:var(--color-slate-700)]! cursor-pointer! [box-shadow:0_1px_2px_rgba(0,0,0,0.02)]!"
            >
              <span>{accessFilter}</span>
              <span
                className={"material-symbols-outlined" + " " + "text-[16px]! [color:var(--color-slate-500)]!"}

              >
                keyboard_arrow_down
              </span>
            </button>

            {isAccessDropdownOpen && (
              <div
                className="absolute! top-[calc(100%_+_4px)]! right-[0]! w-[150px]! [background-color:var(--color-white)]! [border:1px_solid_var(--color-slate-200)]! rounded-[8px]! [box-shadow:0_10px_25px_-5px_rgba(0,_0,_0,_0.1)]! p-[4px]! z-[50]!"
              >
                {["Access", "Can edit", "View Only"].map((acc) => (
                  <div
                    key={acc}
                    onClick={() => {
                      setAccessFilter(acc);
                      setIsAccessDropdownOpen(false);
                      setCurrentPage(1);
                    }}
                    className="p-[7px_10px]! text-[13px]! rounded-[6px]! cursor-pointer!" style={{
  color: accessFilter === acc ? "var(--color-primary)" : "var(--color-slate-700)",
  fontWeight: accessFilter === acc ? "600" : "400",
  backgroundColor: accessFilter === acc ? "var(--color-primary-subtle)" : "transparent"
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
            className="[background:none]! border-0! [color:var(--color-primary)]! text-[13px]! font-semibold! cursor-pointer! p-[6px_8px]!"
          >
            clear
          </button>
        </div>
      </div>

      {/* ── Selection Action Toolbar ── */}
      <div
        className="flex! items-center! justify-between! mb-[12px]! min-h-[36px]!"
      >
        <div className="text-[14px]! font-bold! [color:var(--color-slate-900)]!">
          {selectedIds.length > 0 ? `${selectedIds.length} Selected` : ""}
        </div>

        {selectedIds.length > 0 && (
          <div className="flex! items-center! gap-[8px]!">
            <button
              type="button"
              onClick={handleDownloadSelected}
              className="p-[6px_14px]! [background-color:var(--color-white)]! [border:1px_solid_var(--color-slate-200)]! rounded-[8px]! text-[13px]! font-semibold! [color:var(--color-slate-900)]! cursor-pointer! [box-shadow:0_1px_2px_rgba(0,0,0,0.02)]!"
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
                className="p-[6px_14px]! [background-color:var(--color-danger-bg)]! [border:1px_solid_#FECACA]! rounded-[8px]! text-[13px]! font-semibold! [color:var(--color-danger-dark)]! cursor-pointer! inline-flex! items-center! gap-[4px]! [box-shadow:0_1px_2px_rgba(0,0,0,0.02)]!"
              >
                <span className={"material-symbols-outlined" + " " + "text-[16px]!"} >
                  delete
                </span>
                Delete ({selectedIds.length})
              </button>
            )}

            <button
              type="button"
              onClick={handleClearSelection}
              className="p-[6px_14px]! [background-color:var(--color-white)]! [border:1px_solid_var(--color-slate-200)]! rounded-[8px]! text-[13px]! font-semibold! [color:var(--color-slate-900)]! cursor-pointer! [box-shadow:0_1px_2px_rgba(0,0,0,0.02)]!"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* ── Documents Table Card ── */}
      <div
        className="[background-color:var(--color-white)]! rounded-[12px]! [border:1px_solid_var(--color-slate-200)]! [box-shadow:0_1px_3px_rgba(0,_0,_0,_0.02)]! overflow-x-auto! w-full!"
      >
        <div className="min-w-[760px]!">
          {/* Table Header */}
          <div
            className="grid! grid-cols-[48px_minmax(200px,_2.5fr)_minmax(70px,_0.9fr)_minmax(130px,_1.4fr)_minmax(100px,_1.1fr)_minmax(95px,_1fr)_70px]! [background-color:#EEF2FF]! p-[12px_16px]! [border-bottom:1px_solid_var(--color-slate-200)]! items-center! text-[13px]! font-semibold! [color:var(--color-slate-600)]! [border-top-left-radius:12px]! [border-top-right-radius:12px]!"
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
            <div className="min-w-0!">Document name</div>
            <div className="min-w-0!">Type</div>
            <div className="min-w-0!">Uploaded by</div>
            <div className="min-w-0!">Date</div>
            <div className="min-w-0!">Access</div>
            <div className="text-right! pr-[8px]! min-w-0!">Action</div>
          </div>

          {/* Table Body */}
          {loading ? (
            <div
              className="p-[48px_24px]! text-center! [color:var(--color-slate-400)]! flex! flex-col! items-center! gap-[10px]!"
            >
              <span
                className={"material-symbols-outlined" + " " + "text-[32px]! [animation:spin_1s_linear_infinite]!"}

              >
                progress_activity
              </span>
              <span className="text-[13px]!">Loading project documents...</span>
            </div>
          ) : paginatedDocs.length === 0 ? (
            <div
              className="p-[48px_24px]! text-center! [color:var(--color-slate-400)]! text-[14px]!"
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
                  className={"pm-doc-row" + " " + "grid! grid-cols-[48px_minmax(200px,_2.5fr)_minmax(70px,_0.9fr)_minmax(130px,_1.4fr)_minmax(100px,_1.1fr)_minmax(95px,_1fr)_70px]! p-[14px_16px]! items-center! text-[13px]! [color:var(--color-slate-700)]! cursor-pointer!"}
                  style={{
  borderBottom: idx === paginatedDocs.length - 1 ? "none" : "1px solid var(--color-slate-100)",
  backgroundColor: isSelected ? "#F0F7FF" : "var(--color-white)"
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
                    className="flex! items-center! gap-[10px]! overflow-hidden! min-w-0!"
                  >
                    <span
                      className={"material-symbols-outlined" + " " + "text-[20px]! shrink-0!"}
                      style={{
  color: doc.type === "PDF" ? "var(--color-danger)" : doc.type === "DOCX" || doc.type === "DOC" ? "var(--color-primary)" : doc.type === "XLSX" || doc.type === "XLS" ? "var(--color-success)" : doc.type === "PNG" || doc.type === "JPG" || doc.type === "JPEG" ? "#8B5CF6" : "var(--color-slate-500)"
}}
                    >
                      description
                    </span>
                    <div className="overflow-hidden! min-w-0!">
                      <div
                        className="font-semibold! [color:var(--color-slate-900)]! whitespace-nowrap! overflow-hidden! text-ellipsis!"
                        title={doc.name}
                      >
                        {doc.name}
                      </div>
                      {doc.projectName && (
                        <div
                          className="text-[11px]! [color:var(--color-slate-400)]! mt-[2px]! whitespace-nowrap! overflow-hidden! text-ellipsis!"
                        >
                          {doc.projectName}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Type */}
                  <div className="[color:var(--color-slate-500)]! font-medium! min-w-0!">
                    {doc.type}
                  </div>

                  {/* Uploaded By */}
                  <div
                    className="[color:var(--color-slate-700)]! whitespace-nowrap! overflow-hidden! text-ellipsis! min-w-0!"
                    title={doc.uploadedBy}
                  >
                    {doc.uploadedBy}
                  </div>

                  {/* Date */}
                  <div className="[color:var(--color-slate-500)]! whitespace-nowrap! min-w-0!">
                    {doc.date}
                  </div>

                  {/* Access */}
                  <div className="min-w-0!">
                    <span
                      className="inline-flex! items-center! justify-center! p-[3px_9px]! rounded-[6px]! text-[11px]! font-semibold! tracking-[0.2px]! whitespace-nowrap! box-border! h-[22px]!" style={{
  backgroundColor: doc.access === "Can edit" ? "var(--color-success-bg)" : "var(--color-slate-100)",
  color: doc.access === "Can edit" ? "var(--color-success-dark)" : "var(--color-slate-600)",
  border: doc.access === "Can edit" ? "1px solid #BBF7D0" : "1px solid var(--color-slate-200)"
}}
                    >
                      {doc.access}
                    </span>
                  </div>

                  {/* Action Menu Column */}
                  <div
                    className="text-right! relative! min-w-0!"
                    onClick={(e) => e.stopPropagation()}
                  >
                  <button
                    type="button"
                    className={"doc-actions-menu-btn" + " " + "[background:none]! border-0! [color:var(--color-slate-500)]! cursor-pointer! p-[4px]! rounded-[4px]! inline-flex! items-center! justify-center!"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuDocId(isMenuOpen ? null : doc.id);
                    }}

                    aria-label="Actions menu"
                  >
                    <span className={"material-symbols-outlined" + " " + "text-[18px]!"} >
                      more_horiz
                    </span>
                  </button>

                  {/* Actions Dropdown */}
                  {isMenuOpen && (
                    <div
                      className={"doc-actions-dropdown" + " " + "absolute! right-[0]! top-[calc(100%_+_2px)]! [background-color:var(--color-white)]! [border:1px_solid_var(--color-slate-200)]! rounded-[8px]! [box-shadow:0_10px_25px_-5px_rgba(0,_0,_0,_0.1)]! z-[100]! w-[130px]! p-[4px]!"}

                    >
                      {/* Download Option */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadSingle(doc);
                          setActiveMenuDocId(null);
                        }}
                        className={"flex! items-center! gap-[8px]! p-[8px_12px]! text-[13px]! font-medium! [color:var(--color-slate-800)]! cursor-pointer! text-left! [transition:background-color_0.12s]! rounded-[4px]!" + ' ' + "hover:[background-color:var(--color-slate-50)]!"}

                      >
                        <span
                          className={"material-symbols-outlined" + " " + "text-[16px]! [color:var(--color-slate-500)]!"}

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
                          className={"flex! items-center! gap-[8px]! p-[8px_12px]! text-[13px]! font-medium! [color:var(--color-slate-800)]! cursor-pointer! text-left! [transition:background-color_0.12s]! rounded-[4px]!" + ' ' + "hover:[background-color:var(--color-slate-50)]!"}

                        >
                          <span
                            className={"material-symbols-outlined" + " " + "text-[16px]! [color:var(--color-slate-500)]!"}

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
                          className={"flex! items-center! gap-[8px]! p-[8px_12px]! text-[13px]! font-medium! [color:var(--color-danger)]! cursor-pointer! text-left! [transition:background-color_0.12s]! rounded-[4px]!" + ' ' + "hover:[background-color:var(--color-danger-bg)]!"} style={{
  borderTop: canRename ? "1px solid var(--color-slate-100)" : "none"
}}

                        >
                          <span
                            className={"material-symbols-outlined" + " " + "text-[16px]! [color:var(--color-danger)]!"}

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
          className="flex! items-center! justify-between! mt-[16px]! p-[0_4px]!"
        >
          <div className="text-[12px]! [color:var(--color-slate-400)]!">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, filteredDocs.length)} of{" "}
            {filteredDocs.length} documents
          </div>

          {/* Page Buttons */}
          <div className="flex! items-center! gap-[4px]!">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="w-[28px]! h-[28px]! rounded-[6px]! [border:1px_solid_var(--color-slate-200)]! [background-color:var(--color-white)]! flex! items-center! justify-center!" style={{
  color: currentPage === 1 ? "var(--color-slate-300)" : "var(--color-slate-600)",
  cursor: currentPage === 1 ? "not-allowed" : "pointer"
}}
            >
              <span className={"material-symbols-outlined" + " " + "text-[16px]!"} >
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
                  className="w-[28px]! h-[28px]! rounded-[6px]! text-[12px]! cursor-pointer! flex! items-center! justify-center!" style={{
  border: isActive ? "none" : "1px solid var(--color-slate-200)",
  backgroundColor: isActive ? "var(--color-primary)" : "var(--color-white)",
  color: isActive ? "var(--color-white)" : "var(--color-slate-600)",
  fontWeight: isActive ? "700" : "500"
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
              className="w-[28px]! h-[28px]! rounded-[6px]! [border:1px_solid_var(--color-slate-200)]! [background-color:var(--color-white)]! flex! items-center! justify-center!" style={{
  color: currentPage === totalPages ? "var(--color-slate-300)" : "var(--color-slate-600)",
  cursor: currentPage === totalPages ? "not-allowed" : "pointer"
}}
            >
              <span className={"material-symbols-outlined" + " " + "text-[16px]!"} >
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

  return <section className="p-[24px_32px]!">{renderDocumentContent()}</section>;
}
