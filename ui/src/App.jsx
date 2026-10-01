import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage, ForgotPasswordPage, ProtectedRoute } from './features/auth/index.js'
import DependenciesPage from './features/dependencies/DependenciesPage.jsx'
import TasksPage from './features/tasks/TasksPage.jsx'
import CalendarPage from './features/calendar/CalendarPage.jsx'
import ChatPage from './features/chat/ChatPage.jsx'
import { ProjectSelectionProvider } from './features/projects/ProjectSelection.jsx'
import ProjectsPage from './features/projects/ProjectsPage.jsx'
import ProjectEditorPage from './features/projects/editor/ProjectEditorPage.jsx'
import PmProjects from './features/projects/pm_projects.jsx'
import ProjectManagerDashboard from './modules/project-manager/dashboard.jsx'
import UserDashboard from './modules/user/user_dashboard.jsx'
import PageLayout from './layouts/PageLayout.jsx'
import { MyProfile } from './features/profile/index.js'
import NotificationsPage from './features/notifications/NotificationsPage.jsx'
import { NotificationPopup } from './features/notifications/NotificationPopup.jsx'
import './App.css'

function Dashboard({ user, variant }) {
  if (variant === 'user' || user?.role === 'Regular User' || user?.role === 'User') {
    return <UserDashboard user={user} />
  }
  if (user?.role === 'Project Manager') {
    return <ProjectManagerDashboard user={user} />
  }
  return (
    <section className="dashboard-placeholder">
      <h1>{user.role} dashboard</h1>
      <p>Signed in as {user.first_name} {user.last_name}</p>
    </section>
  )
}

function DashboardRoute({ allowedRoles, variant }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      {(user) => (
        <PageLayout user={user}>
          <Dashboard user={user} variant={variant} />
        </PageLayout>
      )}
    </ProtectedRoute>
  )
}

function ProfileRoute({ allowedRoles }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      {(user) => <MyProfile user={user} />}
    </ProtectedRoute>
  )
}

function NotificationsRoute({ allowedRoles }) {
  const [searchQuery, setSearchQuery] = useState('')
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      {(user) => <PageLayout user={user} searchQuery={searchQuery} onSearchChange={(event) => setSearchQuery(event.target.value)}><NotificationsPage searchQuery={searchQuery} /></PageLayout>}
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ProjectSelectionProvider>
      <NotificationPopup />
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
        <Route path="/profile" element={<ProfileRoute />} />
        <Route path="/user/profile" element={<ProfileRoute />} />
        <Route path="/pm/profile" element={<ProfileRoute allowedRoles={['Project Manager']} />} />
        <Route path="/admin/profile" element={<ProfileRoute allowedRoles={['Administrator']} />} />
        <Route path="/notifications" element={<NotificationsRoute />} />
        <Route path="/user/notifications" element={<NotificationsRoute />} />
        <Route path="/pm/notifications" element={<NotificationsRoute allowedRoles={['Project Manager']} />} />
        <Route path="/admin/notifications" element={<NotificationsRoute allowedRoles={['Administrator']} />} />
        <Route path="/tasks" element={<PageLayout><TasksPage /></PageLayout>} />
        <Route path="/projects" element={<PageLayout><ProjectsPage /></PageLayout>} />
        <Route path="/pm/projects" element={<PageLayout><PmProjects /></PageLayout>} />
        <Route path="/projects/new" element={<PageLayout><ProjectEditorPage /></PageLayout>} />
        <Route path="/projects/:projectId/edit" element={<PageLayout><ProjectEditorPage /></PageLayout>} />
        <Route path="/dependencies" element={<PageLayout><DependenciesPage /></PageLayout>} />
        <Route path="/calendar" element={<PageLayout><CalendarPage /></PageLayout>} />
        <Route path="/chat" element={<PageLayout><ChatPage /></PageLayout>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </ProjectSelectionProvider>
    </BrowserRouter>
  )
}
