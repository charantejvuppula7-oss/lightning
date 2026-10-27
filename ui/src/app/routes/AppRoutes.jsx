import { lazy, Suspense, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from '../../features/auth/pages/LoginPage.jsx'
import ProtectedRoute from './RouteGuard.jsx'
import AppLayout from '../../layouts/AppLayout.jsx'

const TasksPage = lazy(() => import('../../features/tasks/TasksPage.jsx'))
const UsersPage = lazy(() => import('../../features/users/UsersPage.jsx'))
const DocumentsPage = lazy(() => import('../../features/documents/DocumentsPage.jsx'))
const WorkloadPage = lazy(() => import('../../features/workload/WorkloadPage.jsx'))
const ApprovalsPage = lazy(() => import('../../features/approvals/ApprovalsPage.jsx'))
const CalendarPage = lazy(() => import('../../features/calendar/CalendarPage.jsx'))
const ProjectsPage = lazy(() => import('../../features/projects/ProjectsPage.jsx'))
const ProjectEditorLayout = lazy(() => import('../../features/projects/editor/ProjectEditorLayout.jsx'))
const ProjectOverviewPage = lazy(() => import('../../features/projects/ProjectOverviewPage.jsx'))
const OverviewDashboard = lazy(() => import('../../features/dashboard/OverviewDashboard.jsx'))
const WorkspaceDashboard = lazy(() => import('../../features/dashboard/WorkspaceDashboard.jsx'))
const NotificationsPage = lazy(() => import('../../features/notifications/NotificationsPage.jsx'))
const ForgotPasswordPage = lazy(() => import('../../features/auth/pages/ForgotPasswordPage.jsx'))
const MyProfile = lazy(() => import('../../features/profile/MyProfile.jsx'))
const ApiLogsPage = lazy(() => import('../../features/audit/pages/ApiLogsPage.jsx'))
const AuditLogsPage = lazy(() => import('../../features/audit/pages/AuditLogsPage.jsx'))
const DatabaseExplorerPage = lazy(() => import('../../features/audit/pages/DatabaseExplorerPage.jsx'))

function Dashboard({ user, variant }) {
  if (variant === 'workspace' || user?.role === 'Regular User' || user?.role === 'User') {
    return <WorkspaceDashboard user={user} />
  }
  return <OverviewDashboard user={user} />
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
      {(user) => <AppLayout user={user} searchQuery={searchQuery} onSearchChange={(event) => setSearchQuery(event.target.value)}><NotificationsPage searchQuery={searchQuery} /></AppLayout>}
    </ProtectedRoute>
  )
}

function ProjectsRoute() {
  return <ProtectedRoute requiredPermission={{ module: 'Projects', action: 'View' }}>
    {(user) => <AppLayout user={user}><ProjectsPage user={user} /></AppLayout>}
  </ProtectedRoute>
}

function ProjectCreateRoute() {
  return <ProtectedRoute requiredPermission={{ module: 'Projects', action: 'Create' }}>
    {(user) => <ProjectEditorLayout user={user} />}
  </ProtectedRoute>
}

function ProjectEditRoute() {
  return <ProtectedRoute requiredPermission={{ module: 'Projects', action: 'Edit' }}>
    {(user) => <ProjectEditorLayout user={user} />}
  </ProtectedRoute>
}

function PermissionPageRoute({ module, children, searchQuery, onSearchChange }) {
  return <ProtectedRoute requiredPermission={{ module, action: 'View' }}>
    {(user) => <AppLayout user={user} searchQuery={searchQuery} onSearchChange={onSearchChange}>{typeof children === 'function' ? children(user) : children}</AppLayout>}
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
    { path: `/${role}/approvals`, module: 'Approvals', page: user => <ApprovalsPage user={user} /> },
  ]),
  { path: '/admin/all-projects', module: 'Projects', page: user => <ProjectOverviewPage user={user} /> },
  { path: '/user/projects', module: 'Projects', page: user => <ProjectsPage user={user} /> },
  ...['pm', 'user'].map(role => ({ path: `/${role}/calendar`, module: 'Calendar', page: () => <CalendarPage /> })),
]
const searchablePages = { Chat:ChatPage, Dependencies:DependenciesPage, 'Roles & permissions':RolesPermissionsPage }
function SearchableFeatureRoute({ module }) {
  const [query,setQuery] = useState('')
  const Page = searchablePages[module]
  return <PermissionPageRoute module={module} searchQuery={query} onSearchChange={event => setQuery(event.target.value)}>{user => <Suspense fallback={<p role="status" className="p-[24px]!">Loading...</p>}><Page user={user} searchQuery={query} /></Suspense>}</PermissionPageRoute>
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<p role="status" className="p-6">Loading...</p>}>
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin/login" element={<Navigate to="/login" replace />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage mode="forgot" />} />
      <Route path="/verify-identity" element={<ForgotPasswordPage mode="verify" />} />
      <Route path="/reset-password" element={<ForgotPasswordPage mode="reset" />} />
      <Route path="/admin/dashboard" element={<DashboardRoute allowedRoles={['Administrator']} />} />
      <Route path="/pm/dashboard" element={<DashboardRoute allowedRoles={['Project Manager']} />} />
      <Route path="/user/dashboard" element={<DashboardRoute variant="workspace" />} />
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
      <Route path="/pm/projects" element={<ProtectedRoute allowedRoles={['Project Manager']} requiredPermission={{ module: 'Projects', action: 'View' }}>
        {(user) => <AppLayout user={user}><ProjectOverviewPage user={user} /></AppLayout>}
      </ProtectedRoute>} />
      <Route path="/projects/new" element={<ProjectCreateRoute />} />
      <Route path="/projects/:projectId/edit" element={<ProjectEditRoute />} />
      <Route path="/dependencies" element={<SearchableFeatureRoute module="Dependencies" />} />
      <Route path="/calendar" element={<PermissionPageRoute module="Calendar"><CalendarPage /></PermissionPageRoute>} />
      <Route path="/chat" element={<SearchableFeatureRoute module="Chat" />} />
      <Route path="/pm/audit-logs" element={<ProtectedRoute>{user => <AuditLogsPage user={user} />}</ProtectedRoute>} />
      <Route path="/user/audit-logs" element={<ProtectedRoute requiredPermission={{ module: 'Audit Logs', action: 'View' }}>{user => <AuditLogsPage user={user} />}</ProtectedRoute>} />
      <Route path="/admin/api-logs" element={
        <ProtectedRoute>
          {(user) => <ApiLogsPage user={user} />}
        </ProtectedRoute>
      } />
      <Route path="/admin/audit-logs" element={
        <ProtectedRoute>
          {(user) => <AuditLogsPage user={user} />}
        </ProtectedRoute>
      } />
      <Route path="/admin/db-explorer" element={
        <ProtectedRoute>
          {(user) => <DatabaseExplorerPage user={user} />}
        </ProtectedRoute>
      } />
      {sidebarRoutes.map(({ path, module, page }) => <Route key={path} path={path} element={searchablePages[module] ? <SearchableFeatureRoute module={module} /> : <PermissionPageRoute module={module}>{page}</PermissionPageRoute>} />)}
      <Route path="/admin/database" element={<ProtectedRoute>{user => <DatabaseExplorerPage user={user} />}</ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
    </Suspense>
  )
}
