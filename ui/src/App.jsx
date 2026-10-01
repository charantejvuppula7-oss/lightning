import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { LoginPage, ForgotPasswordPage, ProtectedRoute, logout } from './features/auth/index.js'
import DependenciesPage from './features/dependencies/DependenciesPage.jsx'
import TasksPage from './features/tasks/TasksPage.jsx'
import CalendarPage from './features/calendar/CalendarPage.jsx'
import ChatPage from './features/chat/ChatPage.jsx'
import PmProjects from './features/projects/pm_projects.jsx'
import ProjectManagerDashboard from './modules/project-manager/dashboard.jsx'
import UserDashboard from './modules/user/user_dashboard.jsx'
import Navbar from './layouts/Navbar.jsx'
import Sidebar from './layouts/Sidebar.jsx'
import './App.css'

function AppLayout({ user, children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const path = location.pathname.replace(/\/$/, '')
  const role = user?.role === 'Administrator' ? 'admin' : 'user'
  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch {
      // Keep the current page visible if the server cannot end the session.
    }
  }
  const handleSidebarNavigation = event => {
    const link = event.target.closest('.sidebar-link')
    const label = link?.querySelector('.sidebar-label')?.textContent.trim()
    if (label === 'Dashboard' || label === 'Projects') {
      event.preventDefault()
      if (label === 'Projects') {
        navigate('/projects')
        return
      }
      navigate(user?.role === 'Project Manager' ? '/pm/dashboard' : user?.role === 'Administrator' ? '/admin/dashboard' : '/user/dashboard')
    }
  }

  return (
    <div className="app-shell" onClickCapture={handleSidebarNavigation}>
      <Sidebar active={path} effectiveRole={role} onLogout={handleLogout} />
      <main className="main-column">
        <Navbar />
        {children}
      </main>
    </div>
  )
}

function Dashboard({ user, variant }) {
  return variant === 'user' ? <UserDashboard user={user} /> : <ProjectManagerDashboard user={user} />
}

function DashboardRoute({ allowedRoles, variant }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      {(user) => (
        <AppLayout user={user}>
          <Dashboard user={user} variant={variant} />
        </AppLayout>
      )}
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/login" element={<Navigate to="/login" replace />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage mode="forgot" />} />
        <Route path="/verify-identity" element={<ForgotPasswordPage mode="verify" />} />
        <Route path="/reset-password" element={<ForgotPasswordPage mode="reset" />} />
        <Route path="/admin/dashboard" element={<DashboardRoute allowedRoles={['Administrator']} />} />
        <Route path="/pm/dashboard" element={<DashboardRoute allowedRoles={['Project Manager']} />} />
        <Route path="/user/dashboard" element={<DashboardRoute variant="user" />} />
        <Route path="/tasks" element={<AppLayout><TasksPage /></AppLayout>} />
        <Route path="/dependencies" element={<AppLayout><DependenciesPage /></AppLayout>} />
        <Route path="/calendar" element={<AppLayout><CalendarPage /></AppLayout>} />
        <Route path="/chat" element={<AppLayout><ChatPage /></AppLayout>} />
        <Route path="/projects" element={<AppLayout><PmProjects /></AppLayout>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
