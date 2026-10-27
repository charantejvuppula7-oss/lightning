import { useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Input from '../../../shared/ui/Input.jsx'
import Button from '../../../shared/ui/Button.jsx'
import Icon from '../../../shared/ui/Icon.jsx'
import { confirmReset, requestReset, verifyOtp } from '../api/authApi.js'
import { authError } from '../../../shared/utils/errors.js'
import logo from '../../../assets/lightning-logo-light.png'

import useRetryTimer from '../useRetryTimer.js'

const titles = { forgot: 'Forgot your password?', verify: 'Verify your identity', reset: 'Create a new password' }

const passwordChecks = [
  ['length', 'At least 8 characters'],
  ['uppercase', 'One uppercase letter'],
  ['number', 'One number'],
  ['special', 'One special character'],
]

export default function ForgotPasswordPage({ mode }) {
  const navigate = useNavigate()
  const { state } = useLocation()

  const pending = useRef(false)
  const codeRefs = useRef([])
  const [identifier, setIdentifier] = useState(state?.identifier || '')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const retry = useRetryTimer(`lighting_v2_password_${mode}_retry`)
  const resendTimer = useRetryTimer('lighting_v2_otp_resend')
  const timeLeft = resendTimer.remaining
  const remaining = mode === 'forgot' ? Math.max(retry.remaining, timeLeft) : retry.remaining

  if (mode === 'verify' && !state?.identifier) return <Navigate to="/forgot-password" replace />
  if (mode === 'reset' && !state?.resetToken) return <Navigate to="/forgot-password" replace />

  const perform = async (action, sendingCode = false) => {
    const cooldown = sendingCode && mode !== 'forgot' ? timeLeft : remaining
    if (pending.current || cooldown) return
    pending.current = true
    setLoading(true)
    setError('')
    try { await action() } catch (err) {
      if (err.status === 429) {
        if (sendingCode) resendTimer.start(err.retryAfter || 60)
        else retry.start(err.retryAfter || 60)
      }
      setError(authError(err, 'Please try again.'))
    }
    finally { pending.current = false; setLoading(false) }
  }

  const request = (event) => {
    event.preventDefault()
    if (!identifier.trim()) { setError('Please enter your User ID or Email.'); return }
    perform(async () => {
      const data = await requestReset(identifier.trim())
      resendTimer.start(data.resend_after)
      navigate('/verify-identity', { state: { identifier: identifier.trim() } })
    }, true)
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
      const data = await verifyOtp(state?.identifier, otp)
      if (!data?.reset_token) throw new Error('Unexpected server response')
      navigate('/reset-password', { state: { identifier: state?.identifier, resetToken: data.reset_token } })
    })
  }

  const resend = () => perform(async () => {
    const data = await requestReset(state?.identifier)
    setCode(['', '', '', '', '', ''])
    resendTimer.start(data.resend_after)
    codeRefs.current[0]?.focus()
  }, true)

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
      await confirmReset(state?.resetToken, password)
      navigate('/login', { replace: true, state: { notice: 'Password updated successfully. Please log in.' } })
    })
  }

  return (
    <div className="flex! flex-col! justify-center! items-center! min-h-screen! [background-color:var(--color-white)]! relative! p-[32px_24px]! [font-family:'Inter',_sans-serif]! overflow-hidden!">
      <div className={mode === 'forgot' ? "absolute! left-[-40px]! top-[10%]! z-[1]! opacity-[0.8]! pointer-events-none!" : "absolute! right-[-40px]! top-[5%]! z-[1]! opacity-[0.8]! pointer-events-none!"} aria-hidden="true">
        <svg width="220" height="220" viewBox="0 0 24 24" fill="none">
          <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="var(--color-slate-100)" stroke="var(--color-slate-100)" />
        </svg>
      </div>
      <div className="absolute! top-[24px]! left-[24px]! flex! items-center! gap-[6px]! z-[10]! select-none!">
        <img src={logo} alt="Lightning PDPM" className="h-[30px]! w-auto! block!" />
      </div>
      <div className="[background-color:var(--color-white)]! rounded-[20px]! [border:1px_solid_var(--color-slate-200)]! p-[48px_40px]! w-full! max-w-[460px]! flex! flex-col! z-[5]! [box-shadow:0_1px_3px_rgba(0,0,0,0.01)]!">
        {mode === 'verify' && (
          <div className="flex! justify-center! mb-[16px]!">
            <div className="w-[44px]! h-[44px]! rounded-[50%]! [background-color:var(--color-primary-subtle)]! flex! items-center! justify-center!">
              <Icon name="lock" size={22} className="[color:var(--color-primary)]!" />
            </div>
          </div>
        )}
        <h2 className={mode === 'verify' ? "text-[22px]! font-bold! [color:var(--color-slate-900)]! text-center! tracking-[-0.01em]!" : "text-[24px]! font-bold! [color:var(--color-slate-900)]! text-center! tracking-[-0.01em]!"}>{titles[mode]}</h2>
        <p className="text-[14.5px]! [color:var(--color-slate-600)]! leading-[1.5]! text-center! mt-[8px]! mb-[28px]!">
          {mode === 'forgot' && 'Enter your User ID or Email and we’ll send a verification code to reset your password.'}
          {mode === 'verify' && <>We’ve sent a 6-digit verification code to your registered email address.</>}
          {mode === 'reset' && 'Choose a strong password for your Lightning account.'}
        </p>

        {mode === 'forgot' && (
          <form onSubmit={request} className="flex! flex-col! gap-[20px]!">
            <Input
              label="User ID or Email"
              name="identifier"
              value={identifier}
              onChange={(e) => { setIdentifier(e.target.value); setError('') }}
              error={error}
              placeholder="Enter your User ID or Email"
              required
              disabled={loading}
              autoComplete="username"
              fieldClassName={"flex! flex-col! gap-[8px]!"}
              labelClassName={"font-semibold! text-[13.5px]! [color:var(--color-slate-900)]!"}
              wrapperClassName={"relative! flex! items-center! w-full!"}
              inputClassName={"w-full! p-[12px_14px_12px_42px]! text-[14px]! [border:1px_solid_var(--color-slate-300)]! rounded-[8px]! [color:var(--color-slate-900)]! outline-none! [background-color:var(--color-white)]! [transition:border-color_0.2s,_box-shadow_0.2s]!"}
              leftIcon={{
  name: 'person',
  className: "absolute! left-[14px]! [color:var(--color-slate-500)]!"
}}
            />
            <Button type="submit" loading={loading} disabled={remaining > 0} loadingText="Sending..." className="w-full! p-[14px]! [background-color:var(--color-primary)]! [color:var(--color-white)]! border-0! rounded-[8px]! text-[14px]! font-semibold! cursor-pointer! mt-[8px]! flex! items-center! justify-center! gap-[8px]! [transition:background-color_0.15s_ease]!">
              <span>{remaining ? `Try again in ${remaining}s` : 'Send Verification Code'}</span>
              <Icon name="arrow_forward" size={18} />
            </Button>
          </form>
        )}

        {mode === 'verify' && (
          <>
            <form onSubmit={verify} className="flex! flex-col! gap-[24px]!">
              <div className="grid! grid-cols-[repeat(6,_1fr)]! gap-[10px]! justify-center!" role="group" aria-label="Verification code">
                {code.map((digit, index) => (
                  <Input
                    key={index}
                    name={`digit-${index}`}
                    ariaLabel={`Digit ${index + 1}`}
                    value={digit}
                    onChange={(event) => changeDigit(index, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Backspace' && !code[index] && index > 0) {
                        codeRefs.current[index - 1]?.focus()
                      }
                    }}
                    inputRef={(element) => { codeRefs.current[index] = element }}
                    maxLength={1}
                    inputMode="numeric"
                    placeholder="-"
                    className={'code-input'}
                    inputClassName={"h-[46px]! w-full! rounded-[8px]! [border:1px_solid_var(--color-slate-300)]! [background-color:var(--color-slate-50)]! text-center! text-[18px]! font-semibold! [color:var(--color-slate-900)]! outline-none! [transition:border-color_0.2s,_background-color_0.2s,_box-shadow_0.2s]!"}
                    disabled={loading}
                  />
                ))}
              </div>
              {error && <div role="alert" className="[color:var(--color-danger)]! text-[13px]!">{error}</div>}
              <Button type="submit" loading={loading} disabled={remaining > 0} loadingText="Verifying..." className="w-full! p-[14px]! [background-color:var(--color-primary)]! [color:var(--color-white)]! border-0! rounded-[8px]! text-[14.5px]! font-semibold! cursor-pointer! flex! items-center! justify-center! gap-[8px]! [transition:background-color_0.15s_ease]!">
                {remaining ? `Try again in ${remaining}s` : 'Verify Code'} <Icon name="arrow_forward" size={18} />
              </Button>
            </form>
            <div className="flex! flex-col! items-center! gap-[8px]! mt-[20px]!">
              <div className="text-[13.5px]! [color:var(--color-slate-600)]!">
                Didn't receive the code?{' '}
                <Button
                  onClick={resend}
                  disabled={timeLeft > 0}
                  loading={loading}
                  style={{
                    border: 0,
                    background: 'none',
                    color: timeLeft ? 'var(--color-slate-400)' : 'var(--color-primary)',
                    fontWeight: 600,
                    cursor: timeLeft ? 'not-allowed' : 'pointer',
                  }}
                >
                  Resend code
                </Button>
              </div>
              {timeLeft > 0 && (
                <div className="flex! items-center! gap-[4px]! text-[12.5px]! [color:var(--color-slate-500)]!">
                  <Icon name="schedule" size={16} /> Resend code in {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                </div>
              )}
            </div>
            <Link to="/forgot-password" className="flex! items-center! justify-center! gap-[6px]! mt-[20px]! cursor-pointer! select-none! text-[13.5px]! font-semibold! [color:var(--color-slate-500)]! no-underline!">
              <Icon name="arrow_back" size={18} /> Back
            </Link>
            <div className="flex! gap-[10px]! items-start! [background-color:var(--color-primary-subtle)]! p-[12px_14px]! rounded-[8px]! [border:1px_solid_var(--color-primary-border-mid)]! mt-[28px]!">
              <Icon name="security" size={18} className="[color:var(--color-primary)]! text-[18px]! shrink-0! mt-[2px]!" />
              <span className="text-[11.5px]! [color:var(--color-primary-active)]! leading-[1.4]!">
                Never share your verification code with anyone. Our support team will never ask for it.
              </span>
            </div>
          </>
        )}

        {mode === 'reset' && (
          <form onSubmit={reset} className="flex! flex-col! gap-[20px]!">
            <Input
              label="New password"
              name="new-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              autoComplete="new-password"
              fieldClassName={"flex! flex-col! gap-[8px]!"}
              labelClassName={"font-semibold! text-[13.5px]! [color:var(--color-slate-900)]!"}
              wrapperClassName={"relative! flex! items-center! w-full!"}
              inputClassName={"w-full! p-[12px_42px_12px_14px]! text-[14px]! [border:1px_solid_var(--color-slate-300)]! rounded-[8px]! [color:var(--color-slate-900)]! outline-none! [background-color:var(--color-white)]! [transition:border-color_0.2s,_box-shadow_0.2s]!"}
              showVisibility
              visibilityIcon
              visibilityClassName={"absolute! right-[14px]! [color:var(--color-slate-500)]! cursor-pointer! select-none!"}
            />
            <Input
              label="Confirm new password"
              name="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              autoComplete="new-password"
              fieldClassName={"flex! flex-col! gap-[8px]!"}
              labelClassName={"font-semibold! text-[13.5px]! [color:var(--color-slate-900)]!"}
              wrapperClassName={"relative! flex! items-center! w-full!"}
              inputClassName={"w-full! p-[12px_42px_12px_14px]! text-[14px]! [border:1px_solid_var(--color-slate-300)]! rounded-[8px]! [color:var(--color-slate-900)]! outline-none! [background-color:var(--color-white)]! [transition:border-color_0.2s,_box-shadow_0.2s]!"}
              showVisibility
              visibilityIcon
              visibilityClassName={"absolute! right-[14px]! [color:var(--color-slate-500)]! cursor-pointer! select-none!"}
            />
            <div className="flex! flex-col! gap-[6px]! mt-[4px]!">
              <div className="flex! justify-between! items-center!">
                <span className="text-[12.5px]! [color:var(--color-slate-500)]! font-medium!">Password strength</span>
                <span
                  className="text-[12.5px]! font-semibold!" style={{
  color: strength === 'Weak' ? 'var(--color-danger)' : strength === 'Strong' ? 'var(--color-success-alt)' : 'var(--color-primary)'
}}
                >
                  {strength}
                </span>
              </div>
              <div className="grid! grid-cols-[repeat(3,_1fr)]! gap-[8px]! h-[6px]! mt-[2px]!">
                {[1, 2, 3].map((part) => (
                  <div
                    key={part}
                    className="rounded-[2px]! [transition:background-color_0.25s_ease]!" style={{
  backgroundColor: password && count >= (part === 1 ? 1 : part === 2 ? 2 : 4) ? strength === 'Weak' ? 'var(--color-danger)' : strength === 'Medium' ? 'var(--color-primary)' : 'var(--color-success-alt)' : 'var(--color-slate-300)'
}}
                  />
                ))}
              </div>
            </div>
            <div className="[border:1px_solid_var(--color-slate-200)]! rounded-[8px]! [background-color:var(--color-white)]! p-[16px]! flex! flex-col! gap-[10px]!">
              {passwordChecks.map(([key, label]) => (
                <div key={key} className="flex! items-center! gap-[10px]!">
                  <Icon
                    name={checks[key] ? 'check_circle' : 'radio_button_unchecked'}
                    size={18}
                    className="shrink-0 text-[18px] transition-colors duration-200"
                    style={{
                      color: checks[key] ? 'var(--color-primary)' : 'var(--color-slate-300)',
                    }}
                  />
                  <span
                    className="text-[13px]! font-medium! [transition:color_0.2s]!" style={{
  color: checks[key] ? 'var(--color-slate-900)' : 'var(--color-slate-500)'
}}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
            {error && <div role="alert" className="[color:var(--color-danger)]! text-[13px]!">{error}</div>}
            <Button type="submit" loading={loading} disabled={remaining > 0} loadingText="Updating..." className="w-full! p-[14px]! [background-color:var(--color-primary)]! [color:var(--color-white)]! border-0! rounded-[8px]! text-[14.5px]! font-semibold! cursor-pointer! flex! items-center! justify-center! gap-[8px]! [transition:background-color_0.15s_ease]!">
              {remaining ? `Try again in ${remaining}s` : 'Update Password'} <Icon name="arrow_forward" size={18} />
            </Button>
          </form>
        )}

        {mode === 'forgot' && (
          <Link to="/login" className="flex! items-center! justify-center! gap-[6px]! mt-[24px]! cursor-pointer! select-none! text-[13.5px]! font-semibold! [color:var(--color-primary)]! no-underline!">
            <Icon name="arrow_back" size={18} />Back to Log In
          </Link>
        )}
      </div>
      <div className="text-[13px]! [color:var(--color-slate-600)]! mt-[32px]! z-[5]!">
        Need help signing in?{' '}
        <a href="mailto:admin@lightning.com" className={'text-link' + " " + "[color:var(--color-primary)]! font-semibold! cursor-pointer! no-underline!"} >
          Contact your administrator
        </a>
      </div>
      {mode !== 'reset' && (
        <div className="text-[12px]! [color:var(--color-slate-500)]! text-center! mt-[48px]! z-[5]!">
          <div className="mb-[8px]!">© 2024 Lightning SaaS. All rights reserved.</div>
          <div className="flex! gap-[16px]! justify-center!">
            <span className="underline! cursor-pointer! font-medium!">Privacy Policy</span>
            <span className="underline! cursor-pointer! font-medium!">Terms of Service</span>
          </div>
        </div>
      )}
    </div>
  )
}
