import { useState } from "react";

import { apiFetch } from '../../services/api/apiClient.js';



export default function DocumentActionModals({
  toast,
  renameDoc,
  onCloseRename,
  onRenameSuccess,
  deleteDoc,
  onCloseDelete,
  onDeleteSuccess,
}) {
  // ── Rename State ────────────────────────────────────────────────────────
  const [renameInput, setRenameInput] = useState(renameDoc?.name || "");
  const [renameLoading, setRenameLoading] = useState(false);



  // ── Rename Handler ──────────────────────────────────────────────────────
  const handleRenameSubmit = async (e) => {
    e?.preventDefault();
    if (!renameDoc) return;
    const trimmed = (renameInput || "").trim();
    if (!trimmed) {
      toast.error("Document name cannot be empty");
      return;
    }

    setRenameLoading(true);
    try {
      const res = await apiFetch(`/documents/${renameDoc.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ file_name: trimmed }),
      });
      const data = await res.json();
      if (res.ok) {
        const newName = data.file_name || trimmed;
        toast.success(data.message || "Document renamed successfully");
        if (onRenameSuccess) {
          onRenameSuccess(renameDoc.id, newName);
        }
        onCloseRename();
      } else {
        toast.error(data.message || "Failed to rename document");
      }
    } catch (err) {
      console.error("Rename error:", err);
      toast.error("Network error while renaming document");
    } finally {
      setRenameLoading(false);
    }
  };

  // ── Delete State & Handler ──────────────────────────────────────────────
  const [deleteLoading, setDeleteLoading] = useState(false);
  const isBulkDelete = Array.isArray(deleteDoc);
  const deleteCount = isBulkDelete ? deleteDoc.length : 1;
  const deleteName = isBulkDelete
    ? `${deleteCount} selected documents`
    : (deleteDoc?.name || deleteDoc?.File_Name || "this document");

  const handleDeleteSubmit = async () => {
    if (!deleteDoc) return;
    setDeleteLoading(true);
    try {
      if (isBulkDelete) {
        const ids = deleteDoc.map((d) => (typeof d === "object" ? (d.id || d.Id) : d));
        const res = await apiFetch(`/documents/bulk-delete/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ ids }),
        });
        const data = await res.json();
        if (res.ok) {
          toast.success(data.message || `Deleted ${ids.length} document(s) successfully`);
          if (onDeleteSuccess) onDeleteSuccess(ids);
          onCloseDelete();
        } else {
          toast.error(data.message || "Failed to delete documents");
        }
      } else {
        const docId = deleteDoc.id || deleteDoc.Id;
        const res = await apiFetch(`/documents/${docId}/`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",

        });
        const data = await res.json();
        if (res.ok) {
          toast.success(data.message || `Document '${deleteName}' deleted successfully`);
          if (onDeleteSuccess) onDeleteSuccess(docId);
          onCloseDelete();
        } else {
          toast.error(data.message || "Failed to delete document");
        }
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Network error while deleting document");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      {/* ══════════════════ RENAME MODAL ══════════════════ */}
      {renameDoc && (
        <div
          style={styles.modalOverlay}
          onClick={onCloseRename}
        >
          <div
            style={styles.renameCard}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Rename Document</h3>
                <p style={styles.modalSubtitle}>
                  Enter a new title for this file
                </p>
              </div>
              <button
                type="button"
                onClick={onCloseRename}
                style={styles.closeBtn}
                title="Close"
              >
                ×
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleRenameSubmit} style={styles.formContainer}>
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Document Name</label>
                <input
                  type="text"
                  autoFocus
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  placeholder="e.g. Project_Specifications.pdf"
                  style={styles.textInput}
                />
              </div>

              {/* Actions */}
              <div style={styles.modalFooter}>
                <button
                  type="button"
                  onClick={onCloseRename}
                  disabled={renameLoading}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renameLoading}
                  style={styles.primaryBtn}
                >
                  {renameLoading ? "Renaming..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════ DELETE CONFIRMATION MODAL ══════════════════ */}
      {deleteDoc && (
        <div
          style={styles.modalOverlay}
          onClick={onCloseDelete}
        >
          <div
            style={styles.deleteCard}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={styles.deleteIconBadge}>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "22px", color: "var(--color-danger)" }}
                  >
                    delete_forever
                  </span>
                </div>
                <div>
                  <h3 style={styles.modalTitle}>Delete Document</h3>
                  <p style={styles.modalSubtitle}>
                    {isBulkDelete
                      ? "Permanent removal of multiple files"
                      : "This action cannot be undone"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCloseDelete}
                style={styles.closeBtn}
                title="Close"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div style={{ margin: "18px 0", fontSize: "14px", color: "var(--color-slate-700)", lineHeight: "1.5" }}>
              Are you sure you want to permanently delete{" "}
              <strong style={{ color: "var(--color-slate-900)", wordBreak: "break-word" }}>
                "{deleteName}"
              </strong>?
              Once deleted, this document cannot be recovered.
            </div>

            {/* Actions */}
            <div style={styles.modalFooter}>
              <button
                type="button"
                onClick={onCloseDelete}
                disabled={deleteLoading}
                style={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={deleteLoading}
                style={styles.dangerBtn}
              >
                {deleteLoading ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  modalOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "16px",
    boxSizing: "border-box",
  },
  renameCard: {
    backgroundColor: "var(--color-white)",
    borderRadius: "14px",
    boxShadow:
      "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
    width: "100%",
    maxWidth: "440px",
    padding: "24px",
    boxSizing: "border-box",
    animation: "modalFadeIn 0.18s ease-out forwards",
  },
  deleteCard: {
    backgroundColor: "var(--color-white)",
    borderRadius: "14px",
    boxShadow:
      "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
    width: "100%",
    maxWidth: "460px",
    padding: "24px",
    boxSizing: "border-box",
    animation: "modalFadeIn 0.18s ease-out forwards",
  },
  deleteIconBadge: {
    width: "42px",
    height: "42px",
    borderRadius: "10px",
    backgroundColor: "var(--color-danger-border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  shareCard: {
    backgroundColor: "var(--color-white)",
    borderRadius: "16px",
    boxShadow:
      "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
    width: "100%",
    maxWidth: "500px",
    padding: "24px 28px",
    boxSizing: "border-box",
    animation: "modalFadeIn 0.18s ease-out forwards",
  },
  modalHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: "16px",
  },
  modalTitle: {
    fontSize: "17px",
    fontWeight: "700",
    color: "var(--color-slate-900)",
    margin: 0,
  },
  modalSubtitle: {
    fontSize: "13px",
    color: "var(--color-slate-500)",
    margin: "4px 0 0 0",
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: "22px",
    lineHeight: 1,
    color: "var(--color-slate-400)",
    cursor: "pointer",
    padding: "2px 6px",
    borderRadius: "6px",
    transition: "color 0.12s",
  },
  formContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  inputLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "var(--color-slate-600)",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
    marginBottom: "4px",
    display: "block",
  },
  textInput: {
    width: "100%",
    height: "38px",
    padding: "0 12px",
    border: "1px solid var(--color-slate-300)",
    borderRadius: "8px",
    fontSize: "13.5px",
    color: "var(--color-slate-900)",
    backgroundColor: "var(--color-white)",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s ease",
  },
  selectInput: {
    height: "38px",
    padding: "0 10px",
    border: "1px solid var(--color-slate-300)",
    borderRadius: "8px",
    fontSize: "13px",
    color: "var(--color-slate-700)",
    backgroundColor: "var(--color-slate-50)",
    outline: "none",
    cursor: "pointer",
  },
  textareaInput: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid var(--color-slate-300)",
    borderRadius: "8px",
    fontSize: "13px",
    color: "var(--color-slate-900)",
    backgroundColor: "var(--color-white)",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
    resize: "none",
  },
  modalFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "8px",
  },
  cancelBtn: {
    padding: "8px 16px",
    borderRadius: "8px",
    border: "1px solid var(--color-slate-200)",
    backgroundColor: "var(--color-slate-50)",
    color: "var(--color-slate-600)",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.12s",
  },
  primaryBtn: {
    padding: "8px 20px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "var(--color-primary)",
    color: "var(--color-white)",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.12s",
  },
  dangerBtn: {
    padding: "8px 20px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "var(--color-danger-dark)",
    color: "var(--color-white)",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.12s",
  },
  fileInfoChip: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    backgroundColor: "var(--color-slate-50)",
    border: "1px solid var(--color-slate-200)",
    borderRadius: "10px",
    padding: "10px 14px",
  },
  fileBadge: {
    backgroundColor: "var(--color-primary-subtle)",
    color: "var(--color-primary)",
    fontSize: "11px",
    fontWeight: "700",
    padding: "6px 8px",
    borderRadius: "6px",
    border: "1px solid var(--color-primary-border)",
    letterSpacing: "0.5px",
  },
  fileChipName: {
    fontSize: "13.5px",
    fontWeight: "600",
    color: "var(--color-slate-900)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  fileChipMeta: {
    fontSize: "12px",
    color: "var(--color-slate-500)",
    marginTop: "1px",
  },
  copyLinkRow: {
    display: "flex",
    gap: "8px",
  },
  copyLinkInput: {
    flex: 1,
    height: "38px",
    padding: "0 12px",
    backgroundColor: "var(--color-slate-50)",
    border: "1px solid var(--color-slate-300)",
    borderRadius: "8px",
    fontSize: "12.5px",
    color: "var(--color-slate-500)",
    outline: "none",
    boxSizing: "border-box",
  },
  copyLinkBtn: {
    height: "38px",
    padding: "0 14px",
    borderRadius: "8px",
    border: "none",
    color: "var(--color-white)",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexShrink: 0,
    transition: "background-color 0.15s ease",
  },
  dividerRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    margin: "18px 0",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    backgroundColor: "var(--color-slate-200)",
  },
  dividerText: {
    fontSize: "11.5px",
    fontWeight: "500",
    color: "var(--color-slate-400)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
};
