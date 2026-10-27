import { useState } from "react";

import { apiFetch } from '../../shared/api/apiClient.js';

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
          className="fixed! [inset:0]! [background-color:rgba(15,_23,_42,_0.45)]! [backdrop-filter:blur(4px)]! [-webkit-backdrop-filter:blur(4px)]! flex! items-center! justify-center! z-[1000]! p-[16px]! box-border!"
          onClick={onCloseRename}
        >
          <div
            className="[background-color:var(--color-white)]! rounded-[14px]! [box-shadow:0_20px_25px_-5px_rgba(0,_0,_0,_0.1),_0_8px_10px_-6px_rgba(0,_0,_0,_0.05)]! w-full! max-w-[440px]! p-[24px]! box-border! [animation:modalFadeIn_0.18s_ease-out_forwards]!"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex! items-start! justify-between! mb-[16px]!">
              <div>
                <h3 className="text-[17px]! font-bold! [color:var(--color-slate-900)]! m-0!">Rename Document</h3>
                <p className="text-[13px]! [color:var(--color-slate-500)]! m-[4px_0_0_0]!">
                  Enter a new title for this file
                </p>
              </div>
              <button
                type="button"
                onClick={onCloseRename}
                className="[background:none]! border-0! text-[22px]! leading-[1]! [color:var(--color-slate-400)]! cursor-pointer! p-[2px_6px]! rounded-[6px]! [transition:color_0.12s]!"
                title="Close"
              >
                ×
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleRenameSubmit} className="flex! flex-col! gap-[18px]!">
              <div className="flex! flex-col! gap-[6px]!">
                <label className="text-[12px]! font-semibold! [color:var(--color-slate-600)]! [text-transform:uppercase]! tracking-[0.4px]! mb-[4px]! block!">Document Name</label>
                <input
                  type="text"
                  autoFocus
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  placeholder="e.g. Project_Specifications.pdf"
                  className="w-full! h-[38px]! p-[0_12px]! [border:1px_solid_var(--color-slate-300)]! rounded-[8px]! text-[13.5px]! [color:var(--color-slate-900)]! [background-color:var(--color-white)]! outline-none! box-border! [transition:border-color_0.15s_ease]!"
                />
              </div>

              {/* Actions */}
              <div className="flex! items-center! justify-end! gap-[10px]! mt-[8px]!">
                <button
                  type="button"
                  onClick={onCloseRename}
                  disabled={renameLoading}
                  className="p-[8px_16px]! rounded-[8px]! [border:1px_solid_var(--color-slate-200)]! [background-color:var(--color-slate-50)]! [color:var(--color-slate-600)]! text-[13px]! font-semibold! cursor-pointer! [transition:background-color_0.12s]!"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renameLoading}
                  className="p-[8px_20px]! rounded-[8px]! border-0! [background-color:var(--color-primary)]! [color:var(--color-white)]! text-[13px]! font-semibold! cursor-pointer! [transition:background-color_0.12s]!"
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
          className="fixed! [inset:0]! [background-color:rgba(15,_23,_42,_0.45)]! [backdrop-filter:blur(4px)]! [-webkit-backdrop-filter:blur(4px)]! flex! items-center! justify-center! z-[1000]! p-[16px]! box-border!"
          onClick={onCloseDelete}
        >
          <div
            className="[background-color:var(--color-white)]! rounded-[14px]! [box-shadow:0_20px_25px_-5px_rgba(0,_0,_0,_0.1),_0_8px_10px_-6px_rgba(0,_0,_0,_0.05)]! w-full! max-w-[460px]! p-[24px]! box-border! [animation:modalFadeIn_0.18s_ease-out_forwards]!"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex! items-start! justify-between! mb-[16px]!">
              <div className="flex! items-center! gap-[10px]!">
                <div className="w-[42px]! h-[42px]! rounded-[10px]! [background-color:var(--color-danger-border)]! flex! items-center! justify-center! shrink-0!">
                  <span
                    className={"material-symbols-outlined" + " " + "text-[22px]! [color:var(--color-danger)]!"}

                  >
                    delete_forever
                  </span>
                </div>
                <div>
                  <h3 className="text-[17px]! font-bold! [color:var(--color-slate-900)]! m-0!">Delete Document</h3>
                  <p className="text-[13px]! [color:var(--color-slate-500)]! m-[4px_0_0_0]!">
                    {isBulkDelete
                      ? "Permanent removal of multiple files"
                      : "This action cannot be undone"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCloseDelete}
                className="[background:none]! border-0! text-[22px]! leading-[1]! [color:var(--color-slate-400)]! cursor-pointer! p-[2px_6px]! rounded-[6px]! [transition:color_0.12s]!"
                title="Close"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="m-[18px_0]! text-[14px]! [color:var(--color-slate-700)]! leading-[1.5]!">
              Are you sure you want to permanently delete{" "}
              <strong className="[color:var(--color-slate-900)]! [word-break:break-word]!">
                "{deleteName}"
              </strong>?
              Once deleted, this document cannot be recovered.
            </div>

            {/* Actions */}
            <div className="flex! items-center! justify-end! gap-[10px]! mt-[8px]!">
              <button
                type="button"
                onClick={onCloseDelete}
                disabled={deleteLoading}
                className="p-[8px_16px]! rounded-[8px]! [border:1px_solid_var(--color-slate-200)]! [background-color:var(--color-slate-50)]! [color:var(--color-slate-600)]! text-[13px]! font-semibold! cursor-pointer! [transition:background-color_0.12s]!"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={deleteLoading}
                className="p-[8px_20px]! rounded-[8px]! border-0! [background-color:var(--color-danger-dark)]! [color:var(--color-white)]! text-[13px]! font-semibold! cursor-pointer! [transition:background-color_0.12s]!"
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
