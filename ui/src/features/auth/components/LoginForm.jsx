import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Input from '../../../components/ui/Input.jsx'
import Button from '../../../components/ui/Button.jsx'
import { login } from '../api/authApi.js'
import { authError } from '../utils/errors.js'
import { getRoleDashboard } from '../utils/roles.js'
import styles from '../styles/loginStyles.js'

export default function LoginForm() {
  const navigate = useNavigate()
  const pending = useRef(false)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  return <form onSubmit={submit} style={styles.form}>
    {loading && <div style={styles.loadingOverlay}><div style={styles.spinner} /></div>}
    <Input label="User ID" name="identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required disabled={loading} maxLength={254} placeholder="e.g Ravi Kumar" autoComplete="username" fieldStyle={styles.field} labelStyle={styles.label} wrapperStyle={styles.passwordWrapper} inputStyle={styles.input} />
    <div style={styles.field}>
      <div style={styles.labelRow}><label htmlFor="password" style={styles.label}>Password</label><Link to="/forgot-password" className="login-link" style={styles.forgotLink}>Forgot Password?</Link></div>
      <Input name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} maxLength={128} autoComplete="current-password" wrapperStyle={styles.passwordWrapper} inputStyle={{ ...styles.input, paddingRight: 56 }} visibilityStyle={styles.showButton} showVisibility />
    </div>
    {error && <div role="alert" style={{ color: 'var(--color-danger)', fontSize: 13 }}>{error}</div>}
    <Button type="submit" loading={loading} loadingText="Logging in..." style={styles.submitBtn}>Log In</Button>
  </form>
}
