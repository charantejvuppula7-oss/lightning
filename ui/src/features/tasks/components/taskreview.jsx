import { useState, useRef } from "react";


/**
 * TaskReview Dialog Modal ("Send for review")
 *
 * Props:
 *  - isOpen: boolean - whether modal is visible
 *  - onClose: () => void - dismiss callback
 *  - onSubmit: ({ description, files, links }) => Promise<void> | void
 *  - onConfirm: (task, { description, files, links }) => Promise<void> | void - alternative callback
 *  - task: object - optional task context
 */
export default function TaskReview({
  toast,
  isOpen,
  onClose,
  onSubmit,
  onConfirm,
  task = null,
}) {
  const [description, setDescription] = useState("");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [linkInput, setLinkInput] = useState("");
  const [attachedLinks, setAttachedLinks] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    addValidFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addValidFiles = (files) => {
    const valid = [];
    for (const f of files) {
      if (f.size > 25 * 1024 * 1024) {
        toast.error(`"${f.name}" exceeds 25 MB limit`);
        continue;
      }
      valid.push(f);
    }
    if (valid.length > 0) {
      setAttachedFiles((prev) => [...prev, ...valid]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    addValidFiles(files);
  };

  const handleRemoveFile = (index) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddLink = () => {
    const trimmed = linkInput.trim();
    if (!trimmed) return;
    try {
      const urlWithProto = trimmed.match(/^https?:\/\//i) ? trimmed : `https://${trimmed}`;
      new URL(urlWithProto);
      if (!attachedLinks.includes(urlWithProto)) {
        setAttachedLinks((prev) => [...prev, urlWithProto]);
        setLinkInput("");
      } else {
        toast.info("This link has already been added");
      }
    } catch {
      toast.error("Please enter a valid URL link");
    }
  };

  const handleRemoveLink = (index) => {
    setAttachedLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setDescription("");
    setAttachedFiles([]);
    setLinkInput("");
    setAttachedLinks([]);
    setIsSubmitting(false);
    onClose?.();
  };

  const handleSend = async () => {
    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      toast.error("Please enter a description");
      return;
    }

    // Process any lingering link in the input field
    let linksToSend = [...attachedLinks];
    if (linkInput.trim()) {
      const trimmed = linkInput.trim();
      try {
        const urlWithProto = trimmed.match(/^https?:\/\//i) ? trimmed : `https://${trimmed}`;
        new URL(urlWithProto);
        if (!linksToSend.includes(urlWithProto)) {
          linksToSend.push(urlWithProto);
        }
      } catch {
        toast.error("Please enter a valid URL link or clear the link input");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        description: trimmedDesc,
        files: attachedFiles,
        links: linksToSend,
      };

      if (onSubmit) {
        await onSubmit(payload);
      } else if (onConfirm) {
        await onConfirm(task, payload);
        toast.success("Task sent for review successfully");
      }
      handleClose();
    } catch (err) {
      console.error("Error submitting review:", err);
      toast.error(err.message || "Failed to submit for review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.card} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h3 style={styles.title}>Send for review</h3>
            <p style={styles.subtitle}>
              Add context, files, or links for others to review.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={styles.closeButton}
            title="Close"
          >
            ×
          </button>
        </div>

        {/* Divider */}
        <div style={styles.divider} />

        {/* Description Field */}
        <div style={{ marginBottom: "14px" }}>
          <label style={styles.label}>
            Description <span style={styles.requiredAsterisk}>*</span>
          </label>
          <input
            type="text"
            maxLength={200}
            autoFocus
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What’s this about?"
            style={styles.input}
          />
          <div style={styles.charCount}>
            {description.length}/200
          </div>
        </div>

        {/* Attachment Field */}
        <div style={{ marginBottom: "20px" }}>
          <label style={styles.label}>
            Attachment <span style={styles.requiredAsterisk}>*</span>
          </label>

          {/* Dashed Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            style={{
              ...styles.dropzone,
              backgroundColor: isDragging ? "#F0F7FF" : "#FFFFFF",
              borderColor: isDragging ? "#2563EB" : "#D1D5DB",
            }}
          >
            {/* Paperclip Icon */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6B7280"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: "rotate(45deg)",
                margin: "0 auto 8px auto",
                display: "block",
              }}
            >
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>

            <div style={styles.uploadPrimaryText}>Click to upload</div>
            <div style={styles.uploadSubText}>
              Any file type, up to 25 MB each
            </div>

            <input
              type="file"
              ref={fileInputRef}
              multiple
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />
          </div>

          {/* Attached Files List */}
          {attachedFiles.length > 0 && (
            <div style={styles.chipsContainer}>
              {attachedFiles.map((file, idx) => (
                <div key={idx} style={styles.fileChip}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#1558D6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0 }}
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span style={styles.chipText} title={file.name}>
                    {file.name}
                  </span>
                  <span style={styles.chipFileSize}>
                    ({formatFileSize(file.size)})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(idx)}
                    style={styles.chipRemoveBtn}
                    title="Remove file"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Link Input Field */}
          <div style={styles.linkContainer}>
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6B7280"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0, marginLeft: "4px" }}
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <input
              type="text"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              placeholder="Paste a link and press enter"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddLink();
                }
              }}
              style={styles.linkInput}
            />
          </div>

          {/* Attached Links List */}
          {attachedLinks.length > 0 && (
            <div style={styles.chipsContainer}>
              {attachedLinks.map((link, idx) => (
                <div key={idx} style={styles.fileChip}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#1558D6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0 }}
                  >
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.linkChipAnchor}
                    title={link}
                  >
                    {link}
                  </a>
                  <button
                    type="button"
                    onClick={() => handleRemoveLink(idx)}
                    style={styles.chipRemoveBtn}
                    title="Remove link"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={styles.actionsRow}>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            style={styles.cancelBtn}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={isSubmitting}
            style={styles.sendBtn}
          >
            {isSubmitting ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    backdropFilter: "blur(2px)",
    WebkitBackdropFilter: "blur(2px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "16px",
    boxSizing: "border-box",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: "12px",
    boxShadow:
      "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
    width: "100%",
    maxWidth: "420px",
    padding: "20px 22px 20px",
    boxSizing: "border-box",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  title: {
    fontSize: "17px",
    fontWeight: "700",
    color: "#111827",
    margin: 0,
    lineHeight: "1.25",
  },
  subtitle: {
    fontSize: "13px",
    color: "#6B7280",
    margin: "4px 0 0 0",
    lineHeight: "1.4",
  },
  closeButton: {
    background: "none",
    border: "none",
    fontSize: "22px",
    lineHeight: "1",
    color: "#6B7280",
    cursor: "pointer",
    padding: "2px 6px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "color 0.15s, background-color 0.15s",
  },
  divider: {
    height: "1px",
    backgroundColor: "#E5E7EB",
    margin: "14px 0 16px",
  },
  label: {
    fontSize: "13.5px",
    fontWeight: "600",
    color: "#111827",
    display: "block",
    marginBottom: "6px",
  },
  requiredAsterisk: {
    color: "#EF4444",
    fontWeight: "600",
    marginLeft: "2px",
  },
  input: {
    width: "100%",
    height: "42px",
    padding: "0 12px",
    border: "1px solid #D1D5DB",
    borderRadius: "8px",
    fontSize: "13.5px",
    color: "#111827",
    backgroundColor: "#FFFFFF",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  charCount: {
    textAlign: "right",
    fontSize: "12px",
    color: "#6B7280",
    marginTop: "5px",
  },
  dropzone: {
    border: "1.5px dashed #D1D5DB",
    borderRadius: "8px",
    padding: "20px 14px 18px",
    textAlign: "center",
    cursor: "pointer",
    transition: "border-color 0.15s, background-color 0.15s",
    boxSizing: "border-box",
    userSelect: "none",
  },
  uploadPrimaryText: {
    fontSize: "14.5px",
    fontWeight: "600",
    color: "#111827",
    marginBottom: "3px",
  },
  uploadSubText: {
    fontSize: "12px",
    color: "#6B7280",
  },
  linkContainer: {
    display: "flex",
    alignItems: "center",
    border: "1px solid #D1D5DB",
    borderRadius: "8px",
    backgroundColor: "#FFFFFF",
    padding: "0 10px",
    height: "40px",
    marginTop: "10px",
    boxSizing: "border-box",
  },
  linkInput: {
    border: "none",
    outline: "none",
    width: "100%",
    height: "100%",
    fontSize: "13px",
    color: "#111827",
    marginLeft: "8px",
    backgroundColor: "transparent",
  },
  chipsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginTop: "8px",
  },
  fileChip: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#F3F4F6",
    border: "1px solid #E5E7EB",
    borderRadius: "6px",
    padding: "4px 8px",
    fontSize: "12px",
    color: "#374151",
  },
  chipText: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontWeight: "500",
  },
  chipFileSize: {
    fontSize: "11px",
    color: "#6B7280",
    flexShrink: 0,
  },
  linkChipAnchor: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "#1558D6",
    textDecoration: "none",
    fontWeight: "500",
  },
  chipRemoveBtn: {
    background: "none",
    border: "none",
    color: "#9CA3AF",
    cursor: "pointer",
    fontSize: "15px",
    lineHeight: 1,
    padding: "0 2px",
    marginLeft: "2px",
    borderRadius: "3px",
  },
  actionsRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "8px",
  },
  cancelBtn: {
    backgroundColor: "#FFFFFF",
    color: "#111827",
    border: "1px solid #D1D5DB",
    borderRadius: "8px",
    padding: "8px 18px",
    fontSize: "13.5px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.15s, border-color 0.15s",
  },
  sendBtn: {
    backgroundColor: "#1558D6",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "8px",
    padding: "8px 24px",
    fontSize: "13.5px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(21, 88, 214, 0.25)",
    transition: "background-color 0.15s, opacity 0.15s",
  },
};
