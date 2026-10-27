import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function TaskMoreOption({ onEdit, onDelete, disabled = false, className = "" }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const updatePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuWidth = 128;
    const menuHeight = 70;
    const gap = 6;
    const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));
    const cardRect = triggerRef.current.closest(".task-card")?.getBoundingClientRect();
    const cardTop = cardRect?.top ?? 8;
    const cardBottom = cardRect?.bottom ?? (window.innerHeight - 8);
    const below = rect.bottom + gap;
    const top = below + menuHeight <= cardBottom - 6
      ? below
      : Math.max(cardTop + 6, Math.min(rect.top - menuHeight - gap, cardBottom - menuHeight - 6));
    setPosition({ top, left });
  };

  useEffect(() => {
    if (!open) return undefined;
    updatePosition();
    const closeOnOutside = (event) => {
      if (!rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnKey = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnKey);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnKey);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const select = (callback) => (event) => {
    event.stopPropagation();
    setOpen(false);
    callback?.();
  };

  return (
    <>

      <div ref={rootRef} className={`task-more-option ${className}`.trim()} onClick={(event) => event.stopPropagation()}>
        <button ref={triggerRef} type="button" className="task-more-option__trigger" aria-label="More options" aria-haspopup="menu" aria-expanded={open} disabled={disabled} onClick={() => setOpen((value) => !value)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
        </button>
      </div>
      {open && position && createPortal(
        <div ref={menuRef} className="task-more-option__menu" role="menu" style={position}>
          <button type="button" className="task-more-option__item" role="menuitem" onClick={select(onEdit)}>
            <span className="task-more-option__icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m16 4 4 4L8 20l-5 1 1-5L16 4Z" /><path d="M14 6l4 4M3 21h18" /></svg></span> Edit
          </button>
          <button type="button" className="task-more-option__item" role="menuitem" onClick={select(onDelete)}>
            <span className="task-more-option__icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m5 4v6m4-6v6" /></svg></span> Delete
          </button>
        </div>, document.body
      )}
    </>
  );
}
