import { useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Input from '../../../shared/ui/Input.jsx'
import Button from '../../../shared/ui/Button.jsx'
import useSession from '../../../shared/hooks/useSession.js'
import { login } from '../api/authApi.js'
import { authError } from '../../../shared/utils/errors.js'
import { getRoleDashboard } from '../../../shared/utils/roles.js'
import logo from '../../../assets/lightning-logo-light.png'

import useAppVersion from '../../../shared/hooks/useAppVersion.js'
import useRetryTimer from '../useRetryTimer.js'

export default function LoginPage() {
  const version = useAppVersion()
  const navigate = useNavigate()
  const { state } = useLocation()
  const { status, user } = useSession()

  const pending = useRef(false)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const retry = useRetryTimer('lighting_v2_login_retry')

  if (status === 'loading') return <div className="flex! justify-center! items-center! min-h-screen! [background-color:var(--color-slate-50)]! relative! p-[24px]! [font-family:'Inter',_sans-serif]!"><div className="[border:3px_solid_#f3f3f3]! [border-top:3px_solid_#1557d8]! rounded-[50%]! w-[32px]! h-[32px]! [animation:spin_1s_linear_infinite]!" /></div>
  if (status === 'authenticated') return <Navigate to={getRoleDashboard(user.role)} replace />

  const submit = async (event) => {
    event.preventDefault()
    if (pending.current || retry.remaining) return
    if (!identifier.trim() || !password) { setError('Enter your User ID and password.'); return }
    pending.current = true
    setLoading(true)
    setError('')
    try {
      const data = await login(identifier.trim(), password)
      if (!data?.user?.role) throw new Error('Unexpected server response')
      navigate(getRoleDashboard(data.user.role), { replace: true })
    } catch (err) {
      if (err.status === 429) retry.start(err.retryAfter || 60)
      setError(authError(err, 'Login failed. Please try again.'))
    } finally {
      pending.current = false
      setLoading(false)
    }
  }

  return (
    <div className={'login-container' + " " + "flex! justify-center! items-center! min-h-screen! [background-color:var(--color-slate-50)]! relative! p-[24px]! [font-family:'Inter',_sans-serif]!"} >
      <div className="absolute! top-[24px]! left-[24px]! flex! items-center!">
        <img src={logo} alt="Lightning PDPM" className="h-[34px]! w-auto! block!" />
      </div>
      <div className="[background-color:var(--color-white)]! rounded-[20px]! [border:1px_solid_var(--color-slate-200)]! [box-shadow:0_4px_20px_rgba(0,_0,_0,_0.03)]! p-[48px_40px]! w-full! max-w-[460px]! flex! flex-col!">
        <div className="text-[13px]! font-medium! [color:var(--color-slate-600)]!">Get Started</div>
        <h2 className="text-[26px]! font-bold! [color:var(--color-slate-900)]! mt-[8px]! tracking-[-0.02em]!">Log in to Lightning</h2>
        <p className="text-[14px]! [color:var(--color-slate-500)]! leading-[1.5]! mt-[8px]! mb-[28px]!">Enter the User ID and password your project manager gave you.</p>
        {state?.notice && <p role="status" className="[color:var(--color-success-alt)]! text-[13px]! mb-[12px]!">{state.notice}</p>}

        <form onSubmit={submit} className="relative! flex! flex-col! gap-[20px]!">
          {loading && <div className="absolute! top-[0]! left-[0]! right-[0]! bottom-[0]! [background-color:rgba(255,_255,_255,_0.7)]! flex! justify-center! items-center! rounded-[10px]! z-[10]!"><div className="[border:3px_solid_#f3f3f3]! [border-top:3px_solid_#1557d8]! rounded-[50%]! w-[32px]! h-[32px]! [animation:spin_1s_linear_infinite]!" /></div>}
          <Input
            label="User ID"
            name="identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            disabled={loading}
            maxLength={254}
            placeholder="e.g Ravi Kumar"
            autoComplete="username"
            fieldClassName={"flex! flex-col! gap-[8px]!"}
            labelClassName={"font-semibold! text-[14px]! [color:var(--color-slate-900)]!"}
            wrapperClassName={"relative! flex! items-center! w-full!"}
            inputClassName={"w-full! p-[12px_14px]! text-[14px]! [border:1px_solid_var(--color-slate-300)]! rounded-[8px]! [color:var(--color-slate-900)]! outline-none! [background-color:var(--color-white)]! [transition:border-color_0.2s,_box-shadow_0.2s]!"}
          />
          <div className="flex! flex-col! gap-[8px]!">
            <div className="flex! justify-between! items-center!">
              <label htmlFor="password" className="font-semibold! text-[14px]! [color:var(--color-slate-900)]!">Password</label>
              <Link to="/forgot-password" className={'login-link' + " " + "text-[13px]! font-medium! [color:var(--color-slate-900)]! underline! cursor-pointer!"} >Forgot Password?</Link>
            </div>
            <Input
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              maxLength={128}
              autoComplete="current-password"
              wrapperClassName={"relative! flex! items-center! w-full!"}
              inputClassName={"w-full! p-[12px_14px]! text-[14px]! [border:1px_solid_var(--color-slate-300)]! rounded-[8px]! [color:var(--color-slate-900)]! outline-none! [background-color:var(--color-white)]! [transition:border-color_0.2s,_box-shadow_0.2s]! pr-[56px]!"}
              visibilityClassName={"absolute! right-[14px]! [background:none]! border-0! [color:var(--color-slate-900)]! font-semibold! text-[13.5px]! cursor-pointer! p-[4px]! outline-none!"}
              showVisibility
            />
          </div>
          {error && <div role="alert" className="[color:var(--color-danger)]! text-[13px]!">{error}</div>}
          <Button type="submit" loading={loading} disabled={retry.remaining > 0} loadingText="Logging in..." className="w-full! p-[14px]! [background-color:#1557d8]! [color:var(--color-white)]! border-0! rounded-[8px]! text-[15px]! font-semibold! cursor-pointer! mt-[12px]! [transition:background-color_0.15s_ease]!">{retry.remaining ? `Try again in ${retry.remaining}s` : 'Log In'}</Button>
        </form>

        <div className="text-[12px]! [color:var(--color-slate-500)]! text-center! leading-[1.5]! mt-[24px]!">
          By continuing you agree to Lightning's <span className="underline! cursor-pointer! font-medium!">Terms</span> and <span className="underline! cursor-pointer! font-medium!">Privacy Notice</span>
        </div>
        <div className="text-[11.5px]! [color:var(--color-slate-400)]! text-center! mt-[14px]! font-medium! tracking-[0.02em]!">v{version}</div>
      </div>
      <div className="absolute! bottom-[16px]! left-[50%]! [transform:translateX(-50%)]! text-[12px]! [color:var(--color-slate-400)]! font-medium! tracking-[0.02em]! pointer-events-none!">v{version}</div>
    </div>
  )
}
