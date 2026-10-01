import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Input from '../../../components/ui/Input.jsx'
import Button from '../../../components/ui/Button.jsx'
import Icon from '../../../components/ui/Icon.jsx'
import { confirmReset, requestReset, verifyOtp } from '../api/authApi.js'
import { authError } from '../utils/errors.js'
import styles from '../styles/forgotStyles.js'

const passwordChecks = [
  ['length', 'At least 8 characters'],
  ['uppercase', 'One uppercase letter'],
  ['number', 'One number'],
  ['special', 'One special character'],
]

export default function ForgotPasswordForm({ mode, identifier: initialIdentifier, resetToken }) {
  const navigate = useNavigate()
  const pending = useRef(false)
  const codeRefs = useRef([])
  const [identifier, setIdentifier] = useState(initialIdentifier || '')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(59)

  useEffect(() => {
    if (mode !== 'verify' || timeLeft <= 0) return undefined
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
    return () => clearTimeout(timer)
  }, [mode, timeLeft])

  const perform = async (action) => {
    if (pending.current) return
    pending.current = true
    setLoading(true)
    setError('')
    try { await action() } catch (err) { setError(authError(err, 'Please try again.')) }
    finally { pending.current = false; setLoading(false) }
  }

  const request = (event) => {
    event.preventDefault()
    if (!identifier.trim()) { setError('Please enter your User ID or Email.'); return }
    perform(async () => {
      await requestReset(identifier.trim())
      navigate('/verify-identity', { state: { identifier: identifier.trim() } })
    })
  }

  const changeDigit = (index, value) => {
    if (!/^\d?$/.test(value)) return
    setCode((previous) => previous.map((digit, position) => position === index ? value : digit))
    if (value && index < 5) codeRefs.current[index + 1]?.focus()
  }

  const verify = (event) => {
    event.preventDefault()
    const otp = code.join('')
    if (!/^\d{6}$/.test(otp)) { setError('Please enter the complete 6-digit code.'); return }
    perform(async () => {
      const data = await verifyOtp(initialIdentifier, otp)
      if (!data?.reset_token) throw new Error('Unexpected server response')
      navigate('/reset-password', { state: { identifier: initialIdentifier, resetToken: data.reset_token } })
    })
  }

  const resend = () => perform(async () => {
    await requestReset(initialIdentifier)
    setCode(['', '', '', '', '', ''])
    setTimeLeft(59)
    codeRefs.current[0]?.focus()
  })

  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  }
  const count = Object.values(checks).filter(Boolean).length
  const strength = count <= 1 ? 'Weak' : count === 4 ? 'Strong' : 'Medium'

  const reset = (event) => {
    event.preventDefault()
    if (!Object.values(checks).every(Boolean)) { setError('Please meet all password requirements before updating.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    perform(async () => {
      await confirmReset(resetToken, password)
      navigate('/login', { replace: true, state: { notice: 'Password updated successfully. Please log in.' } })
    })
  }

  if (mode === 'forgot') return <form onSubmit={request} style={styles.form}>
    <Input label="User ID or Email" name="identifier" value={identifier} onChange={(e) => { setIdentifier(e.target.value); setError('') }} error={error} placeholder="Enter your User ID or Email" required disabled={loading} autoComplete="username" fieldStyle={styles.field} labelStyle={styles.label} wrapperStyle={styles.inputWrapper} inputStyle={styles.inputWithLeftIcon} leftIcon={{ name: 'person', style: styles.inputIcon }} />
    <Button type="submit" loading={loading} loadingText="Sending..." style={styles.submitBtnForgot}><span>Send Verification Code</span><Icon name="arrow_forward" size={18} /></Button>
  </form>

  if (mode === 'verify') return <>
    <form onSubmit={verify} style={styles.formVerify}>
      <div style={styles.codeInputsRow} role="group" aria-label="Verification code">
        {code.map((digit, index) => <Input key={index} name={`digit-${index}`} ariaLabel={`Digit ${index + 1}`} value={digit} onChange={(event) => changeDigit(index, event.target.value)} onKeyDown={(event) => { if (event.key === 'Backspace' && !code[index] && index > 0) codeRefs.current[index - 1]?.focus() }} inputRef={(element) => { codeRefs.current[index] = element }} maxLength={1} inputMode="numeric" placeholder="-" className="code-input" inputStyle={styles.codeInputBox} disabled={loading} />)}
      </div>
      {error && <div role="alert" style={errorStyle}>{error}</div>}
      <Button type="submit" loading={loading} loadingText="Verifying..." style={styles.submitBtnReset}>Verify Code <Icon name="arrow_forward" size={18} /></Button>
    </form>
    <div style={styles.resendSection}><div style={styles.resendText}>Didn't receive the code? <Button onClick={resend} disabled={timeLeft > 0} loading={loading} style={{ border: 0, background: 'none', color: timeLeft ? 'var(--color-slate-400)' : 'var(--color-primary)', fontWeight: 600, cursor: timeLeft ? 'not-allowed' : 'pointer' }}>Resend code</Button></div>{timeLeft > 0 && <div style={styles.timerDisplay}><Icon name="schedule" size={16} /> Resend code in 00:{String(timeLeft).padStart(2, '0')}</div>}</div>
    <Link to="/forgot-password" style={{ ...styles.backLinkRowVerify, ...styles.backLinkTextVerify, textDecoration: 'none' }}><Icon name="arrow_back" size={18} /> Back</Link>
    <div style={styles.alertBox}><Icon name="security" size={18} style={styles.alertIcon} /><span style={styles.alertText}>Never share your verification code with anyone. Our support team will never ask for it.</span></div>
  </>

  return <form onSubmit={reset} style={styles.form}>
    <Input label="New password" name="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" required disabled={loading} autoComplete="new-password" fieldStyle={styles.field} labelStyle={styles.label} wrapperStyle={styles.inputWrapper} inputStyle={styles.inputWithRightIcon} showVisibility visibilityIcon visibilityStyle={styles.eyeIcon} />
    <Input label="Confirm new password" name="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="••••••••" required disabled={loading} autoComplete="new-password" fieldStyle={styles.field} labelStyle={styles.label} wrapperStyle={styles.inputWrapper} inputStyle={styles.inputWithRightIcon} showVisibility visibilityIcon visibilityStyle={styles.eyeIcon} />
    <div style={styles.strengthMeter}><div style={styles.strengthLabelRow}><span style={styles.strengthLabel}>Password strength</span><span style={{ ...styles.strengthStatus, color: strength === 'Weak' ? 'var(--color-danger)' : strength === 'Strong' ? 'var(--color-success-alt)' : 'var(--color-primary)' }}>{strength}</span></div><div style={styles.strengthSegments}>{[1, 2, 3].map((part) => <div key={part} style={{ ...styles.segment, backgroundColor: password && count >= (part === 1 ? 1 : part === 2 ? 2 : 4) ? strength === 'Weak' ? 'var(--color-danger)' : strength === 'Medium' ? 'var(--color-primary)' : 'var(--color-success-alt)' : 'var(--color-slate-300)' }} />)}</div></div>
    <div style={styles.checklistCard}>{passwordChecks.map(([key, label]) => <div key={key} style={styles.checkRow}><Icon name={checks[key] ? 'check_circle' : 'radio_button_unchecked'} size={18} style={{ ...styles.checkIcon, color: checks[key] ? 'var(--color-primary)' : 'var(--color-slate-300)' }} /><span style={{ ...styles.checkText, color: checks[key] ? 'var(--color-slate-900)' : 'var(--color-slate-500)' }}>{label}</span></div>)}</div>
    {error && <div role="alert" style={errorStyle}>{error}</div>}
    <Button type="submit" loading={loading} loadingText="Updating..." style={styles.submitBtnReset}>Update Password <Icon name="arrow_forward" size={18} /></Button>
  </form>
}

const errorStyle = { color: 'var(--color-danger)', fontSize: 13 }
