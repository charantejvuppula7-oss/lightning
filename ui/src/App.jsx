import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { LoginPage, ForgotPasswordPage, ProtectedRoute, logout } from './features/auth/index.js'

function Dashboard({ user }) {
  const navigate = useNavigate()
  const signOut = async () => {
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch {
      // Keep this screen visible when the server cannot invalidate the session.
    }
  }

  return <main className="dashboard-placeholder">
    <h1>{user.role} dashboard</h1>
    <p>Signed in as {user.first_name} {user.last_name}</p>
    <button type="button" onClick={signOut}>Log out</button>
  </main>
}

function DashboardRoute({ allowedRoles }) {
  return <ProtectedRoute allowedRoles={allowedRoles}>{(user) => <Dashboard user={user} />}</ProtectedRoute>
}

export default function App() {
  return <BrowserRouter><Routes>
    <Route path="/" element={<Navigate to="/login" replace />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/admin/login" element={<Navigate to="/login" replace />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage mode="forgot" />} />
    <Route path="/verify-identity" element={<ForgotPasswordPage mode="verify" />} />
    <Route path="/reset-password" element={<ForgotPasswordPage mode="reset" />} />
    <Route path="/admin/dashboard" element={<DashboardRoute allowedRoles={['Administrator']} />} />
    <Route path="/pm/dashboard" element={<DashboardRoute allowedRoles={['Project Manager']} />} />
    <Route path="/user/dashboard" element={<DashboardRoute />} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes></BrowserRouter>
}
