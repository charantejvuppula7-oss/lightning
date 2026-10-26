import { lazy, Suspense, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage, ForgotPasswordPage } from '../../features/auth/index.js'
import ProtectedRoute from './protectedroute.jsx'
import TasksPage from '../../features/tasks/TasksPage.jsx'
import UsersPage from '../../features/users/UsersPage.jsx'
import DocumentsPage from '../../features/documents/DocumentsPage.jsx'
import WorkloadPage from '../../features/workload/WorkloadPage.jsx'
import ApprovalsPage from '../../features/approvals/ApprovalsPage.jsx'
import CalendarPage from '../../features/calendar/CalendarPage.jsx'
import ProjectsPage from '../../features/projects/ProjectsPage.jsx'
import ProjectEditorPage from '../../features/projects/editor/ProjectEditorPage.jsx'
import PmProjects from '../../features/projects/pm_projects.jsx'
import ProjectManagerDashboard from '../../modules/project-manager/dashboard.jsx'
import UserDashboard from '../../modules/user/user_dashboard.jsx'
import { SidebarLayout } from '../../layouts/Sidebar.jsx'
import { MyProfile } from '../../features/profile/index.js'
import NotificationsPage from '../../features/notifications/NotificationsPage.jsx'
import { ApiLogsPage, AuditLogsPage, DatabaseExplorerPage } from '../../features/audit/index.js'

function Dashboard({ user, variant }) {
  if (variant === 'user' || user?.role === 'Regular User' || user?.role === 'User') {
    return <UserDashboard user={user} />
  }
  if (user?.role === 'Project Manager') {
    return <ProjectManagerDashboard user={user} />
  }
  return <ProjectManagerDashboard user={user} />
}

function DashboardRoute({ allowedRoles, variant }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      {(user) => (
        <SidebarLayout user={user}>
          <Dashboard user={user} variant={variant} />
        </SidebarLayout>
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
      {(user) => <SidebarLayout user={user} searchQuery={searchQuery} onSearchChange={(event) => setSearchQuery(event.target.value)}><NotificationsPage searchQuery={searchQuery} /></SidebarLayout>}
    </ProtectedRoute>
  )
}

function ProjectsRoute() {
  return <ProtectedRoute requiredPermission={{ module: 'Projects', action: 'View' }}>
    {(user) => <SidebarLayout user={user}><ProjectsPage user={user} /></SidebarLayout>}
  </ProtectedRoute>
}

function ProjectCreateRoute() {
  return <ProtectedRoute requiredPermission={{ module: 'Projects', action: 'Create' }}>
    {(user) => <SidebarLayout user={user}><ProjectEditorPage user={user} /></SidebarLayout>}
  </ProtectedRoute>
}

function ProjectEditRoute() {
  return <ProtectedRoute requiredPermission={{ module: 'Projects', action: 'Edit' }}>
    {(user) => <SidebarLayout user={user}><ProjectEditorPage user={user} /></SidebarLayout>}
  </ProtectedRoute>
}

function PermissionPageRoute({ module, children, searchQuery, onSearchChange }) {
  return <ProtectedRoute requiredPermission={{ module, action: 'View' }}>
    {(user) => <SidebarLayout user={user} searchQuery={searchQuery} onSearchChange={onSearchChange}>{typeof children === 'function' ? children(user) : children}</SidebarLayout>}
  </ProtectedRoute>
}

const RolesPermissionsPage = lazy(() => import('../../features/roles/RolesPermissionsPage.jsx'))

const DependenciesPage = lazy(() => import('../../features/dependencies/DependenciesPage.jsx'))

const ChatPage = lazy(() => import('../../features/chat/ChatPage.jsx'))

// Keep Company sidebar URLs while sharing the feature implementations in this checkout.
const sidebarRoutes = [
  ...['admin', 'pm', 'user'].flatMap(role => [
    { path: `/${role}/tasks`, module: 'Tasks', page: user => <TasksPage user={user} /> },
    { path: `/${role}/users`, module: 'User Management', page: user => <UsersPage user={user} /> },
    { path: `/${role}/documents`, module: 'Documents', page: user => <DocumentsPage user={user} /> },
    { path: `/${role}/workload`, module: 'TeamWorLoad', page: () => <WorkloadPage /> },
    { path: `/${role}/dependencies`, module: 'Dependencies', page: user => <DependenciesPage user={user} /> },
    { path: `/${role}/chat`, module: 'Chat', page: user => <ChatPage user={user} /> },
    { path: `/${role}/roles-permissions`, module: 'Roles & permissions', page: user => <RolesPermissionsPage user={user} /> },
    { path: `/${role}/approvals`, module: ['Tasks','Dependencies'], page: user => <ApprovalsPage user={user} /> },
  ]),
  { path: '/admin/all-projects', module: 'Projects', page: user => <PmProjects user={user} /> },
  { path: '/user/projects', module: 'Projects', page: user => <ProjectsPage user={user} /> },
  ...['pm', 'user'].map(role => ({ path: `/${role}/calendar`, module: 'Milestones', page: () => <CalendarPage /> })),
]
const searchablePages = { Chat:ChatPage, Dependencies:DependenciesPage, 'Roles & permissions':RolesPermissionsPage }
function SearchableFeatureRoute({ module }) {
  const [query,setQuery] = useState('')
  const Page = searchablePages[module]
  return <PermissionPageRoute module={module} searchQuery={query} onSearchChange={event => setQuery(event.target.value)}>{user => <Suspense fallback={<p role="status" style={{padding:24}}>Loading...</p>}><Page user={user} searchQuery={query} /></Suspense>}</PermissionPageRoute>
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
        {(user) => <SidebarLayout user={user}><PmProjects user={user} /></SidebarLayout>}
      </ProtectedRoute>} />
      <Route path="/projects/new" element={<ProjectCreateRoute />} />
      <Route path="/projects/:projectId/edit" element={<ProjectEditRoute />} />
      <Route path="/dependencies" element={<SearchableFeatureRoute module="Dependencies" />} />
      <Route path="/calendar" element={<PermissionPageRoute module="Tasks"><CalendarPage /></PermissionPageRoute>} />
      <Route path="/chat" element={<SearchableFeatureRoute module="Chat" />} />
      <Route path="/pm/audit-logs" element={<ProtectedRoute allowedRoles={['Project Manager']}>{user => <AuditLogsPage user={user} />}</ProtectedRoute>} />
      <Route path="/user/audit-logs" element={<ProtectedRoute requiredPermission={{ module: 'Audit Logs', action: 'View' }}>{user => <AuditLogsPage user={user} />}</ProtectedRoute>} />
      <Route path="/admin/api-logs" element={
        <ProtectedRoute allowedRoles={['Administrator']}>
          {(user) => <ApiLogsPage user={user} />}
        </ProtectedRoute>
      } />
      <Route path="/admin/audit-logs" element={
        <ProtectedRoute allowedRoles={['Administrator']}>
          {(user) => <AuditLogsPage user={user} />}
        </ProtectedRoute>
      } />
      <Route path="/admin/db-explorer" element={
        <ProtectedRoute allowedRoles={['Administrator']}>
          {(user) => <DatabaseExplorerPage user={user} />}
        </ProtectedRoute>
      } />
      {sidebarRoutes.map(({ path, module, page }) => <Route key={path} path={path} element={searchablePages[module] ? <SearchableFeatureRoute module={module} /> : <PermissionPageRoute module={module}>{page}</PermissionPageRoute>} />)}
      <Route path="/admin/database" element={<ProtectedRoute allowedRoles={['Administrator']}>{user => <DatabaseExplorerPage user={user} />}</ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
