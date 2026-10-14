import { useEffect } from 'react'

/* styling */
const tailwindStyling = {
  "project-modal-overlay": [
    "[position:fixed]",
    "[inset:0]",
    "[z-index:1200]",
    "[display:grid]",
    "[place-items:center]",
    "[overflow-y:auto]",
    "[padding:16px]",
    "[box-sizing:border-box]",
    "[background:#0f172a75]",
    "[backdrop-filter:blur(3px)]"
  ],
  "project-modal": [
    "[width:min(100%,_870px)]",
    "[max-height:calc(100vh_-_32px)]",
    "[overflow-y:auto]",
    "[padding:32px]",
    "[box-sizing:border-box]",
    "[border:1px_solid_#e2e8f0]",
    "[border-radius:16px]",
    "[background:#fff]",
    "[box-shadow:0_18px_50px_#0f172a30]",
    "[&.wide]:[width:min(100%,_980px)]",
    "max-[700px]:[padding:22px_18px]"
  ],
  "project-modal-header": [
    "[display:flex]",
    "[align-items:flex-start]",
    "[justify-content:space-between]",
    "[gap:18px]",
    "[margin-bottom:26px]",
    "[&_h2]:[margin:0]",
    "[&_h2]:[color:#172033]",
    "[&_h2]:[font-size:22px]",
    "[&_h2]:[font-weight:750]",
    "[&_p]:[margin:8px_0_0]",
    "[&_p]:[color:#718096]",
    "[&_p]:[font-size:16px]",
    "max-[700px]:[&_h2]:[font-size:20px]",
    "max-[700px]:[&_p]:[font-size:14px]"
  ],
  "project-modal-close": [
    "[width:32px]",
    "[height:32px]",
    "[flex:0_0_32px]",
    "[border:0]",
    "[border-radius:6px]",
    "[background:transparent]",
    "[color:#94a3b8]",
    "[font-size:27px]",
    "[line-height:1]",
    "[cursor:pointer]",
    "[&:hover]:[background:#f1f5f9]",
    "[&:hover]:[color:#475569]"
  ],
  "project-modal-field": [
    "[display:grid]",
    "[min-width:0]",
    "[gap:8px]",
    "[color:#334155]",
    "[font-size:15px]",
    "[font-weight:600]",
    "[&_b]:[color:#ef4444]",
    "[&_input]:[width:100%]",
    "[&_input]:[min-height:52px]",
    "[&_input]:[padding:12px_14px]",
    "[&_input]:[box-sizing:border-box]",
    "[&_input]:[border:1px_solid_#cbd5e1]",
    "[&_input]:[border-radius:8px]",
    "[&_input]:[background:#fff]",
    "[&_input]:[color:#334155]",
    "[&_input]:[font:inherit]",
    "[&_input]:[font-size:16px]",
    "[&_input]:[font-weight:400]",
    "[&_input]:[outline:none]",
    "[&_textarea]:[width:100%]",
    "[&_textarea]:[min-height:52px]",
    "[&_textarea]:[padding:12px_14px]",
    "[&_textarea]:[box-sizing:border-box]",
    "[&_textarea]:[border:1px_solid_#cbd5e1]",
    "[&_textarea]:[border-radius:8px]",
    "[&_textarea]:[background:#fff]",
    "[&_textarea]:[color:#334155]",
    "[&_textarea]:[font:inherit]",
    "[&_textarea]:[font-size:16px]",
    "[&_textarea]:[font-weight:400]",
    "[&_textarea]:[outline:none]",
    "[&_select]:[width:100%]",
    "[&_select]:[min-height:52px]",
    "[&_select]:[padding:12px_14px]",
    "[&_select]:[box-sizing:border-box]",
    "[&_select]:[border:1px_solid_#cbd5e1]",
    "[&_select]:[border-radius:8px]",
    "[&_select]:[background:#fff]",
    "[&_select]:[color:#334155]",
    "[&_select]:[font:inherit]",
    "[&_select]:[font-size:16px]",
    "[&_select]:[font-weight:400]",
    "[&_select]:[outline:none]",
    "[&_textarea]:[min-height:112px]",
    "[&_textarea]:[resize:vertical]",
    "[&_input:focus]:[border-color:#2563eb]",
    "[&_input:focus]:[box-shadow:0_0_0_2px_#2563eb24]",
    "[&_textarea:focus]:[border-color:#2563eb]",
    "[&_textarea:focus]:[box-shadow:0_0_0_2px_#2563eb24]",
    "[&_select:focus]:[border-color:#2563eb]",
    "[&_select:focus]:[box-shadow:0_0_0_2px_#2563eb24]",
    "[&_input::placeholder]:[color:#94a3b8]",
    "[&_textarea::placeholder]:[color:#94a3b8]"
  ]
}
const styling = value => {
  const classes = typeof value === 'string' ? value : ''
  const utilities = classes.split(/\s+/).flatMap(name => tailwindStyling[name] || [])
  return [...new Set([...classes.split(/\s+/), ...utilities])].filter(Boolean).join(' ')
}



export function ModalShell({ isOpen, title, subtitle, onClose, children, wide = false }) {
  useEffect(() => {
    if (!isOpen) return undefined
    const onKeyDown = event => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null
  return <div className={styling("project-modal-overlay")} onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className={styling(`project-modal${wide ? ' wide' : ''}`)} role="dialog" aria-modal="true" aria-labelledby="project-modal-title">
      <header className={styling("project-modal-header")}><div><h2 id="project-modal-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
        <button type="button" className={styling("project-modal-close")} onClick={onClose} aria-label="Close">×</button>
      </header>
      {children}
    </section>
  </div>
}

export function ModalField({ label, required, children, error, className = '' }) {
  return <label className={styling(`project-modal-field ${className}`)}>
    <span>{label}{required && <b aria-hidden="true"> *</b>}</span>
    {children}
    {error && <small role="alert">{error}</small>}
  </label>
}
