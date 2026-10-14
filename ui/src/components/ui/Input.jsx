import { useState } from 'react'
import Icon from './Icon.jsx'

/* styling */
const tailwindStyling = {
  'login-input': [
    '[&:focus]:[border-color:var(--color-primary)]!',
    '[&:focus]:[box-shadow:0_0_0_3px_rgba(37,99,235,.1)]!',
  ],
}
const styling = value => {
  const classes = typeof value === 'string' ? value : ''
  return [...new Set([...classes.split(/\s+/), ...classes.split(/\s+/).flatMap(name => tailwindStyling[name] || [])])].filter(Boolean).join(' ')
}

export default function Input({ label, name, type = 'text', value, onChange, error, disabled, required, placeholder, autoComplete, maxLength, inputMode, onKeyDown, inputRef, className = 'login-input', fieldStyle, labelStyle, wrapperStyle, inputStyle, leftIcon, visibilityStyle, showVisibility = false, visibilityIcon = false, ariaLabel }) {
  const [visible, setVisible] = useState(false)
  const id = name
  const errorId = `${name}-error`
  return <div style={fieldStyle}>
    {label && <label htmlFor={id} style={labelStyle}>{label}</label>}
    <div style={wrapperStyle}>
      {leftIcon && <Icon name={leftIcon.name} style={leftIcon.style} />}
      <input ref={inputRef} id={id} name={name} type={showVisibility && visible ? 'text' : type} value={value} onChange={onChange} disabled={disabled} required={required} placeholder={placeholder} autoComplete={autoComplete} maxLength={maxLength} inputMode={inputMode} onKeyDown={onKeyDown} className={styling(className)} style={inputStyle} aria-label={ariaLabel} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} />
      {showVisibility && <button type="button" style={{ background: 'none', border: 0, ...visibilityStyle }} onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'} disabled={disabled}>{visibilityIcon ? <Icon name={visible ? 'visibility' : 'visibility_off'} /> : visible ? 'Hide' : 'Show'}</button>}
    </div>
    {error && <span id={errorId} role="alert" style={{ color: 'var(--color-danger)', fontSize: 12 }}>{error}</span>}
  </div>
}
