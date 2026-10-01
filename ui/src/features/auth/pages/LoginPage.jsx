import { Navigate, useLocation } from 'react-router-dom'
import LoginForm from '../components/LoginForm.jsx'
import useSession from '../hooks/useSession.js'
import { getRoleDashboard } from '../utils/roles.js'
import logo from '../../../assets/lightning-logo-light.png'
import styles from '../styles/loginStyles.js'

export default function LoginPage() {
  const { state } = useLocation()
  const { status, user } = useSession()
  if (status === 'loading') return <div style={styles.container}><div style={styles.spinner} /></div>
  if (status === 'authenticated') return <Navigate to={getRoleDashboard(user.role)} replace />
  return <div className="login-container" style={styles.container}>
    <div style={styles.logoBox}><img src={logo} alt="Lightning PDPM" style={{ height: 34, width: 'auto', display: 'block' }} /></div>
    <div style={styles.card}>
      <div style={styles.getStarted}>Get Started</div>
      <h2 style={styles.cardTitle}>Log in to Lightning</h2>
      <p style={styles.cardSubtitle}>Enter the User ID and password your project manager gave you.</p>
      {state?.notice && <p role="status" style={{ color: 'var(--color-success-alt)', fontSize: 13, marginBottom: 12 }}>{state.notice}</p>}
      <LoginForm />
      <div style={styles.footerTerms}>By continuing you agree to Lightning's <span style={styles.footerLink}>Terms</span> and <span style={styles.footerLink}>Privacy Notice</span></div>
    </div>
  </div>
}
