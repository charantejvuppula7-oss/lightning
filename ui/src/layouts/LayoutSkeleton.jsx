import { readSidebarCollapsed } from './sidebarState.js'
function Skeleton({ className = '' }) {
  return <div className={`layout-skeleton-block ${className}`} />
}

export default function LayoutSkeleton({ pathname }) {
  const role = pathname.startsWith('/admin/') ? 'admin' : pathname.startsWith('/pm/') ? 'pm' : 'user'
  const collapsed = readSidebarCollapsed(role)
  const dashboard = pathname.endsWith('/dashboard')

  return (
    <div className={`layout-skeleton ${collapsed ? 'layout-skeleton-collapsed' : ''}`} style={{ '--skeleton-sidebar-width': collapsed ? '68px' : '220px' }}>
      <aside className="layout-skeleton-sidebar" aria-hidden="true">
        <div className="layout-skeleton-brand">
          <Skeleton className="layout-skeleton-logo" />
          <Skeleton className="layout-skeleton-toggle" />
        </div>
        <div className="layout-skeleton-menu">
          {Array.from({ length: 10 }, (_, index) => (
            <div className="layout-skeleton-menu-item" key={index}>
              <Skeleton className="layout-skeleton-icon" />
              <Skeleton className="layout-skeleton-menu-label" />
            </div>
          ))}
        </div>
        <div className="layout-skeleton-footer">
          <Skeleton className="layout-skeleton-logout" />
        </div>
      </aside>
      <div className="layout-skeleton-main">
        <header className="layout-skeleton-navbar">
          <div className="layout-skeleton-navbar-left">
            <div aria-hidden="true"><Skeleton className="layout-skeleton-selector" /></div>
          </div>
          <div className="layout-skeleton-navbar-right" aria-hidden="true">
            <Skeleton className="layout-skeleton-search" />
            <Skeleton className="layout-skeleton-icon" />
            <Skeleton className="layout-skeleton-avatar" />
          </div>
        </header>
        <main className="layout-skeleton-content" aria-hidden="true">
          <div className="layout-skeleton-page-heading">
            <div className="layout-skeleton-titles">
              <Skeleton className="layout-skeleton-title" />
              <Skeleton className="layout-skeleton-subtitle" />
            </div>
            <Skeleton className="layout-skeleton-action" />
          </div>
          <div className="layout-skeleton-cards">
            {Array.from({ length: dashboard ? 4 : 3 }, (_, index) => (
              <div className="layout-skeleton-panel layout-skeleton-card" key={index}>
                <Skeleton className="layout-skeleton-subtitle" />
                <Skeleton className="layout-skeleton-value" />
                <Skeleton className="layout-skeleton-line" />
              </div>
            ))}
          </div>
          {dashboard && <div className="layout-skeleton-charts">
            {[0, 1].map(index => <div className="layout-skeleton-panel" key={index}>
              <Skeleton className="layout-skeleton-title" />
              <Skeleton className="layout-skeleton-chart" />
            </div>)}
          </div>}
          <div className="layout-skeleton-panel">
            <div className="layout-skeleton-filters">
              <Skeleton className="layout-skeleton-search" />
              <Skeleton className="layout-skeleton-action" />
              <Skeleton className="layout-skeleton-action" />
            </div>
            {Array.from({ length: 6 }, (_, row) => <div className="layout-skeleton-table-row" key={row}>
              {Array.from({ length: 4 }, (_, column) => <Skeleton className="layout-skeleton-line" key={column} />)}
            </div>)}
          </div>
        </main>
      </div>
    </div>
  )
}
