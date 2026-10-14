import { useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Input from '../../../components/ui/Input.jsx'
import Button from '../../../components/ui/Button.jsx'
import useSession from '../../../app/hooks/useSession.js'
import { login } from '../api/authApi.js'
import { authError } from '../../../utils/errors.js'
import { getRoleDashboard } from '../../../utils/roles.js'
import logo from '../../../assets/lightning-logo-light.png'
import styles from '../styles/loginStyles.js'

/* styling */
const tailwindStyling = {
  'login-container': [
    '[&_.login-input:focus]:[border-color:#1557d8]!',
    '[&_.login-input:focus]:[box-shadow:0_0_0_3px_rgba(21,87,216,.1)]!',
  ],
  'login-link': ['[&:hover]:[color:var(--color-primary-hover)]!'],
}
const styling = value => {
  const classes = typeof value === 'string' ? value : ''
  return [...new Set([...classes.split(/\s+/), ...classes.split(/\s+/).flatMap(name => tailwindStyling[name] || [])])].filter(Boolean).join(' ')
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { status, user } = useSession()

  const pending = useRef(false)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (status === 'loading') return <div style={styles.container}><div style={styles.spinner} /></div>
  if (status === 'authenticated') return <Navigate to={getRoleDashboard(user.role)} replace />

  const submit = async (event) => {
    event.preventDefault()
    if (pending.current) return
    if (!identifier.trim() || !password) { setError('Enter your User ID and password.'); return }
    pending.current = true
    setLoading(true)
    setError('')
    try {
      const data = await login(identifier.trim(), password)
      if (!data?.user?.role) throw new Error('Unexpected server response')
      navigate(getRoleDashboard(data.user.role), { replace: true })
    } catch (err) {
      setError(authError(err, 'Login failed. Please try again.'))
    } finally {
      pending.current = false
      setLoading(false)
    }
  }

  return (
    <div className={styling('login-container')} style={styles.container}>
      <div style={styles.logoBox}>
        <img src={logo} alt="Lightning PDPM" style={{ height: 34, width: 'auto', display: 'block' }} />
      </div>
      <div style={styles.card}>
        <div style={styles.getStarted}>Get Started</div>
        <h2 style={styles.cardTitle}>Log in to Lightning</h2>
        <p style={styles.cardSubtitle}>Enter the User ID and password your project manager gave you.</p>
        {state?.notice && <p role="status" style={{ color: 'var(--color-success-alt)', fontSize: 13, marginBottom: 12 }}>{state.notice}</p>}

        <form onSubmit={submit} style={styles.form}>
          {loading && <div style={styles.loadingOverlay}><div style={styles.spinner} /></div>}
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
            fieldStyle={styles.field}
            labelStyle={styles.label}
            wrapperStyle={styles.passwordWrapper}
            inputStyle={styles.input}
          />
          <div style={styles.field}>
            <div style={styles.labelRow}>
              <label htmlFor="password" style={styles.label}>Password</label>
              <Link to="/forgot-password" className={styling('login-link')} style={styles.forgotLink}>Forgot Password?</Link>
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
              wrapperStyle={styles.passwordWrapper}
              inputStyle={{ ...styles.input, paddingRight: 56 }}
              visibilityStyle={styles.showButton}
              showVisibility
            />
          </div>
          {error && <div role="alert" style={{ color: 'var(--color-danger)', fontSize: 13 }}>{error}</div>}
          <Button type="submit" loading={loading} loadingText="Logging in..." style={styles.submitBtn}>Log In</Button>
        </form>

        <div style={styles.footerTerms}>
          By continuing you agree to Lightning's <span style={styles.footerLink}>Terms</span> and <span style={styles.footerLink}>Privacy Notice</span>
        </div>
      </div>
    </div>
  )
}
