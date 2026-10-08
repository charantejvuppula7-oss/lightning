import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage, ForgotPasswordPage } from '../../features/auth/index.js'
import ProtectedRoute from './protectedroute.jsx'
import DependenciesPage from '../../features/dependencies/DependenciesPage.jsx'
import TasksPage from '../../features/tasks/TasksPage.jsx'
import CalendarPage from '../../features/calendar/CalendarPage.jsx'
import ChatPage from '../../features/chat/ChatPage.jsx'
import ProjectsPage from '../../features/projects/ProjectsPage.jsx'
import ProjectEditorPage from '../../features/projects/editor/ProjectEditorPage.jsx'
import PmProjects from '../../features/projects/pm_projects.jsx'
import ProjectManagerDashboard from '../../modules/project-manager/dashboard.jsx'
import UserDashboard from '../../modules/user/user_dashboard.jsx'
import PageLayout from '../../layouts/PageLayout.jsx'
import { MyProfile } from '../../features/profile/index.js'
import NotificationsPage from '../../features/notifications/NotificationsPage.jsx'
import { ApiLogsPage, AuditLogsPage, DatabaseExplorerPage } from '../../features/audit/index.js'

/* styling */
const tailwindStyling = {
  'dashboard-placeholder': [
    '[padding:28px]',
    'max-[600px]:[padding:16px]',
  ],
}
const styling = value => {
  const classes = typeof value === 'string' ? value : ''
  const utilities = classes.split(/\s+/).flatMap(name => tailwindStyling[name] || [])
  return [...new Set([...classes.split(/\s+/), ...utilities])].filter(Boolean).join(' ')
}

function Dashboard({ user, variant }) {
  if (variant === 'user' || user?.role === 'Regular User' || user?.role === 'User') {
    return <UserDashboard user={user} />
  }
  if (user?.role === 'Project Manager') {
    return <ProjectManagerDashboard user={user} />
  }
  return (
    <section className={styling('dashboard-placeholder')}>
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

function ProjectsRoute() {
  return <ProtectedRoute requiredPermission={{ module: 'Projects', action: 'View' }}>
    {(user) => <PageLayout user={user}><ProjectsPage user={user} /></PageLayout>}
  </ProtectedRoute>
}

function ProjectCreateRoute() {
  return <ProtectedRoute requiredPermission={{ module: 'Projects', action: 'Create' }}>
    {(user) => <PageLayout user={user}><ProjectEditorPage user={user} /></PageLayout>}
  </ProtectedRoute>
}

function ProjectEditRoute() {
  return <ProtectedRoute requiredPermission={{ module: 'Projects', action: 'Edit' }}>
    {(user) => <PageLayout user={user}><ProjectEditorPage user={user} /></PageLayout>}
  </ProtectedRoute>
}

function PermissionPageRoute({ module, children }) {
  return <ProtectedRoute requiredPermission={{ module, action: 'View' }}>
    {(user) => <PageLayout user={user}>{typeof children === 'function' ? children(user) : children}</PageLayout>}
  </ProtectedRoute>
}

export default function AppRoutes() {
  return (
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
      <Route path="/tasks" element={<PermissionPageRoute module="Tasks">{(user) => <TasksPage user={user} />}</PermissionPageRoute>} />
      <Route path="/projects" element={<ProjectsRoute />} />
      <Route path="/pm/projects" element={<ProtectedRoute allowedRoles={['Project Manager']}>
        {(user) => <PageLayout user={user}><PmProjects /></PageLayout>}
      </ProtectedRoute>} />
      <Route path="/projects/new" element={<ProjectCreateRoute />} />
      <Route path="/projects/:projectId/edit" element={<ProjectEditRoute />} />
      <Route path="/dependencies" element={<PermissionPageRoute module="Dependencies">{(user) => <DependenciesPage user={user} />}</PermissionPageRoute>} />
      <Route path="/calendar" element={<PermissionPageRoute module="Tasks"><CalendarPage /></PermissionPageRoute>} />
      <Route path="/chat" element={<PermissionPageRoute module="Projects"><ChatPage /></PermissionPageRoute>} />
      <Route path="/admin/api-logs" element={
        <ProtectedRoute allowedRoles={['Administrator']}>
          {(user) => <PageLayout user={user}><ApiLogsPage /></PageLayout>}
        </ProtectedRoute>
      } />
      <Route path="/admin/audit-logs" element={
        <ProtectedRoute allowedRoles={['Administrator']}>
          {(user) => <PageLayout user={user}><AuditLogsPage /></PageLayout>}
        </ProtectedRoute>
      } />
      <Route path="/admin/db-explorer" element={
        <ProtectedRoute allowedRoles={['Administrator']}>
          {(user) => <PageLayout user={user}><DatabaseExplorerPage /></PageLayout>}
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
