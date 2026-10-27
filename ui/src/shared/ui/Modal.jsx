import { useEffect } from 'react'

export function ModalShell({ isOpen, title, subtitle, onClose, children, wide = false }) {
  useEffect(() => {
    if (!isOpen) return undefined
    const onKeyDown = event => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null
  return <div className="project-modal-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className={`project-modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="project-modal-title">
      <header className="project-modal-header"><div><h2 id="project-modal-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
        <button type="button" className="project-modal-close" onClick={onClose} aria-label="Close">×</button>
      </header>
      {children}
    </section>
  </div>
}

export function ModalField({ label, required, children, error, className = '' }) {
  return <label className={`project-modal-field ${className}`}>
    <span>{label}{required && <b aria-hidden="true"> *</b>}</span>
    {children}
    {error && <small role="alert">{error}</small>}
  </label>
}
