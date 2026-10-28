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
    <div className="fixed! [inset:0]! [background-color:rgba(15,_23,_42,_0.45)]! [backdrop-filter:blur(2px)]! [-webkit-backdrop-filter:blur(2px)]! flex! items-center! justify-center! z-[9999]! p-[16px]! box-border!" onClick={handleClose}>
      <div className="[background-color:#FFFFFF]! rounded-[12px]! [box-shadow:0_20px_25px_-5px_rgba(0,_0,_0,_0.1),_0_8px_10px_-6px_rgba(0,_0,_0,_0.05)]! w-full! max-w-[420px]! p-[20px_22px_20px]! box-border! [font-family:-apple-system,_BlinkMacSystemFont,_'Segoe_UI',_Roboto,_'Inter',_sans-serif]!" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex! items-start! justify-between!">
          <div>
            <h3 className="text-[17px]! font-bold! [color:#111827]! m-0! leading-[1.25]!">Send for review</h3>
            <p className="text-[13px]! [color:#6B7280]! m-[4px_0_0_0]! leading-[1.4]!">
              Add context, files, or links for others to review.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="[background:none]! border-0! text-[22px]! leading-[1]! [color:#6B7280]! cursor-pointer! p-[2px_6px]! rounded-[6px]! flex! items-center! justify-center! [transition:color_0.15s,_background-color_0.15s]!"
            title="Close"
          >
            ×
          </button>
        </div>

        {/* Divider */}
        <div className="h-[1px]! [background-color:#E5E7EB]! m-[14px_0_16px]!" />

        {/* Description Field */}
        <div className="mb-[14px]!">
          <label className="text-[13.5px]! font-semibold! [color:#111827]! block! mb-[6px]!">
            Description <span className="[color:#EF4444]! font-semibold! ml-[2px]!">*</span>
          </label>
          <input
            type="text"
            maxLength={200}
            autoFocus
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What’s this about?"
            className="w-full! h-[42px]! p-[0_12px]! [border:1px_solid_#D1D5DB]! rounded-[8px]! text-[13.5px]! [color:#111827]! [background-color:#FFFFFF]! outline-none! box-border! [transition:border-color_0.15s,_box-shadow_0.15s]!"
          />
          <div className="text-right! text-[12px]! [color:#6B7280]! mt-[5px]!">
            {description.length}/200
          </div>
        </div>

        {/* Attachment Field */}
        <div className="mb-[20px]!">
          <label className="text-[13.5px]! font-semibold! [color:#111827]! block! mb-[6px]!">
            Attachment <span className="[color:#EF4444]! font-semibold! ml-[2px]!">*</span>
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
            className="[border:1.5px_dashed_#D1D5DB]! rounded-[8px]! p-[20px_14px_18px]! text-center! cursor-pointer! [transition:border-color_0.15s,_background-color_0.15s]! box-border! select-none!" style={{
  backgroundColor: isDragging ? "#F0F7FF" : "#FFFFFF",
  borderColor: isDragging ? "#2563EB" : "#D1D5DB"
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
              className="[transform:rotate(45deg)]! m-[0_auto_8px_auto]! block!"
            >
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>

            <div className="text-[14.5px]! font-semibold! [color:#111827]! mb-[3px]!">Click to upload</div>
            <div className="text-[12px]! [color:#6B7280]!">
              Any file type, up to 25 MB each
            </div>

            <input
              type="file"
              ref={fileInputRef}
              multiple
              className="hidden!"
              onChange={handleFileSelect}
            />
          </div>

          {/* Attached Files List */}
          {attachedFiles.length > 0 && (
            <div className="flex! flex-col! gap-[6px]! mt-[8px]!">
              {attachedFiles.map((file, idx) => (
                <div key={idx} className="flex! items-center! gap-[6px]! [background-color:#F3F4F6]! [border:1px_solid_#E5E7EB]! rounded-[6px]! p-[4px_8px]! text-[12px]! [color:#374151]!">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#1558D6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0!"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span className="flex-1! overflow-hidden! text-ellipsis! whitespace-nowrap! font-medium!" title={file.name}>
                    {file.name}
                  </span>
                  <span className="text-[11px]! [color:#6B7280]! shrink-0!">
                    ({formatFileSize(file.size)})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(idx)}
                    className="[background:none]! border-0! [color:#9CA3AF]! cursor-pointer! text-[15px]! leading-[1]! p-[0_2px]! ml-[2px]! rounded-[3px]!"
                    title="Remove file"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Link Input Field */}
          <div className="flex! items-center! [border:1px_solid_#D1D5DB]! rounded-[8px]! [background-color:#FFFFFF]! p-[0_10px]! h-[40px]! mt-[10px]! box-border!">
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6B7280"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0! ml-[4px]!"
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
              className="border-0! outline-none! w-full! h-full! text-[13px]! [color:#111827]! ml-[8px]! [background-color:transparent]!"
            />
          </div>

          {/* Attached Links List */}
          {attachedLinks.length > 0 && (
            <div className="flex! flex-col! gap-[6px]! mt-[8px]!">
              {attachedLinks.map((link, idx) => (
                <div key={idx} className="flex! items-center! gap-[6px]! [background-color:#F3F4F6]! [border:1px_solid_#E5E7EB]! rounded-[6px]! p-[4px_8px]! text-[12px]! [color:#374151]!">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#1558D6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0!"
                  >
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1! overflow-hidden! text-ellipsis! whitespace-nowrap! [color:#1558D6]! no-underline! font-medium!"
                    title={link}
                  >
                    {link}
                  </a>
                  <button
                    type="button"
                    onClick={() => handleRemoveLink(idx)}
                    className="[background:none]! border-0! [color:#9CA3AF]! cursor-pointer! text-[15px]! leading-[1]! p-[0_2px]! ml-[2px]! rounded-[3px]!"
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
        <div className="flex! items-center! justify-end! gap-[10px]! mt-[8px]!">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="[background-color:#FFFFFF]! [color:#111827]! [border:1px_solid_#D1D5DB]! rounded-[8px]! p-[8px_18px]! text-[13.5px]! font-medium! cursor-pointer! [transition:background-color_0.15s,_border-color_0.15s]!"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={isSubmitting}
            className="[background-color:#1558D6]! [color:#FFFFFF]! border-0! rounded-[8px]! p-[8px_24px]! text-[13.5px]! font-semibold! cursor-pointer! [box-shadow:0_1px_2px_rgba(21,_88,_214,_0.25)]! [transition:background-color_0.15s,_opacity_0.15s]!"
          >
            {isSubmitting ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
