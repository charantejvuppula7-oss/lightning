import { useState } from 'react'
import Icon from './Icon.jsx'

export default function Input({ label, name, type = 'text', value, onChange, error, disabled, required, placeholder, autoComplete, maxLength, inputMode, onKeyDown, inputRef, className = 'login-input', fieldClassName, labelClassName, wrapperClassName, inputClassName, leftIcon, visibilityClassName, showVisibility = false, visibilityIcon = false, ariaLabel }) {
  const [visible, setVisible] = useState(false)
  const id = name
  const errorId = `${name}-error`
  return <div className={fieldClassName}>
    {label && <label htmlFor={id} className={labelClassName}>{label}</label>}
    <div className={wrapperClassName}>
      {leftIcon && <Icon name={leftIcon.name} className={leftIcon.className} />}
      <input ref={inputRef} id={id} name={name} type={showVisibility && visible ? 'text' : type} value={value} onChange={onChange} disabled={disabled} required={required} placeholder={placeholder} autoComplete={autoComplete} maxLength={maxLength} inputMode={inputMode} onKeyDown={onKeyDown} className={`${className} ${inputClassName || ''}`} aria-label={ariaLabel} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} />
      {showVisibility && <button type="button" className={`border-0 bg-transparent ${visibilityClassName || ''}`} onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'} disabled={disabled}>{visibilityIcon ? <Icon name={visible ? 'visibility' : 'visibility_off'} /> : visible ? 'Hide' : 'Show'}</button>}
    </div>
    {error && <span id={errorId} role="alert" className="[color:var(--color-danger)]! text-[12px]!">{error}</span>}
  </div>
}
