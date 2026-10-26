import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const styles = `
  .task-more-option { display: inline-flex; flex: 0 0 auto; }
  .task-more-option__trigger { display: inline-flex; width: 32px; height: 32px; align-items: center; justify-content: center; padding: 0; border: 0; border-radius: 8px; color: #64748b; background: transparent; cursor: pointer; transition: color .15s ease, background .15s ease; }
  .task-more-option__trigger:hover, .task-more-option__trigger[aria-expanded="true"] { color: var(--color-primary, #2563eb); background: var(--color-primary-subtle, #eff6ff); }
  .task-more-option__trigger:focus-visible, .task-more-option__item:focus-visible { outline: 2px solid var(--color-primary, #2563eb); outline-offset: 2px; }
  .task-more-option__menu { position: fixed; z-index: 1200; width: 128px; padding: 3px; border: 1px solid #e2e8f0; border-radius: 9px; background: #fff; box-shadow: 0 8px 18px rgba(15, 23, 42, .14); }
  .task-more-option__item { display: flex; width: 100%; min-height: 28px; align-items: center; gap: 8px; padding: 4px 8px; border: 0; border-radius: 6px; color: #292929; background: transparent; font: 500 12.5px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; text-align: left; cursor: pointer; transition: color .15s ease, background .15s ease; }
  .task-more-option__item:hover { color: var(--color-primary, #2563eb); background: var(--color-primary-subtle, #eff6ff); }
  .task-more-option__item + .task-more-option__item { margin-top: 2px; }
  .task-more-option__icon { display: inline-flex; width: 16px; height: 16px; flex: 0 0 16px; align-items: center; justify-content: center; }
`;

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
      <style>{styles}</style>
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
