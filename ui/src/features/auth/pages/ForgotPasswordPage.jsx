import { Link, Navigate, useLocation } from 'react-router-dom'
import ForgotPasswordForm from '../components/ForgotPasswordForm.jsx'
import Icon from '../../../components/ui/Icon.jsx'
import logo from '../../../assets/lightning-logo-light.png'
import styles from '../styles/forgotStyles.js'

const titles = { forgot: 'Forgot your password?', verify: 'Verify your identity', reset: 'Create a new password' }

export default function ForgotPasswordPage({ mode }) {
  const { state } = useLocation()
  if (mode === 'verify' && !state?.identifier) return <Navigate to="/forgot-password" replace />
  if (mode === 'reset' && !state?.resetToken) return <Navigate to="/forgot-password" replace />

  return <div style={styles.container}>
    <div style={mode === 'forgot' ? styles.bgWatermarkForgot : styles.bgWatermarkRight} aria-hidden="true">
      <svg width="220" height="220" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="var(--color-slate-100)" stroke="var(--color-slate-100)" /></svg>
    </div>
    <div style={styles.logoHeader}><img src={logo} alt="Lightning PDPM" style={{ height: 30, width: 'auto', display: 'block' }} /></div>
    <div style={styles.card}>
      {mode === 'verify' && <div style={styles.iconContainer}><div style={styles.iconCircle}><Icon name="lock" size={22} style={{ color: 'var(--color-primary)' }} /></div></div>}
      <h2 style={mode === 'verify' ? styles.cardTitleVerify : styles.cardTitle}>{titles[mode]}</h2>
      <p style={styles.cardSubtitle}>
        {mode === 'forgot' && 'Enter your User ID or Email and we’ll send a verification code to reset your password.'}
        {mode === 'verify' && <>We’ve sent a 6-digit verification code to your registered email address.</>}
        {mode === 'reset' && 'Choose a strong password for your Lightning account.'}
      </p>
      <ForgotPasswordForm mode={mode} identifier={state?.identifier} resetToken={state?.resetToken} />
      {mode === 'forgot' && <Link to="/login" style={{ ...styles.backLinkRow, ...styles.backLinkText, textDecoration: 'none' }}><Icon name="arrow_back" size={18} />Back to Log In</Link>}
    </div>
    <div style={styles.helpText}>Need help signing in? <a href="mailto:admin@lightning.com" className="text-link" style={styles.adminLink}>Contact your administrator</a></div>
    {mode !== 'reset' && <div style={styles.footerCopyright}><div style={{ marginBottom: 8 }}>© 2024 Lightning SaaS. All rights reserved.</div><div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}><span style={styles.footerLink}>Privacy Policy</span><span style={styles.footerLink}>Terms of Service</span></div></div>}
  </div>
}
