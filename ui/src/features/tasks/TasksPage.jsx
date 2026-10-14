import { useState } from 'react'

export default function TasksPage({ user }) {
  const userRole = String(user?.role || '').toLowerCase()
  const isUserRole = !['admin', 'administrator', 'pm', 'project manager'].includes(userRole)
  const [activeTab, setActiveTab] = useState(() => (isUserRole ? 'my' : 'all'))

  return (
    <section style={{ padding: '24px 32px' }}>
      <header style={{ marginBottom: '16px' }}>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: '800',
            color: '#0f172a',
            margin: '0 0 4px 0',
            letterSpacing: '-0.3px',
            lineHeight: 1.2,
          }}
        >
          {activeTab === 'my' ? 'My Tasks' : 'All Tasks'}
        </h1>
        <p
          style={{
            fontSize: '13px',
            color: '#64748b',
            margin: 0,
            fontWeight: '400',
            lineHeight: 1.4,
          }}
        >
          {activeTab === 'my'
            ? 'Manage and track tasks assigned to you.'
            : 'View and manage tasks of all users across all projects.'}
        </p>
      </header>

      {/* Tabs: All Tasks / My Tasks */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderBottom: '1px solid var(--color-slate-200)',
          marginBottom: '24px',
        }}
      >
        {!isUserRole && (
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            style={{
              background: 'none',
              border: 'none',
              padding: '10px 18px',
              fontSize: '14px',
              fontWeight: activeTab === 'all' ? '700' : '500',
              color: activeTab === 'all' ? 'var(--color-primary)' : 'var(--color-slate-500)',
              borderBottom: activeTab === 'all' ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
              marginBottom: '-1px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>All Tasks</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 7px',
                borderRadius: '10px',
                backgroundColor: activeTab === 'all' ? 'var(--color-primary-subtle)' : 'var(--color-slate-100)',
                color: activeTab === 'all' ? 'var(--color-primary)' : 'var(--color-slate-500)',
                transition: 'all 0.15s ease',
              }}
            >
              30
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('my')}
          style={{
            background: 'none',
            border: 'none',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: activeTab === 'my' ? '700' : '500',
            color: activeTab === 'my' ? 'var(--color-primary)' : 'var(--color-slate-500)',
            borderBottom: activeTab === 'my' ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
            marginBottom: '-1px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <span>My Tasks</span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: '700',
              padding: '2px 7px',
              borderRadius: '10px',
              backgroundColor: activeTab === 'my' ? 'var(--color-primary-subtle)' : 'var(--color-slate-100)',
              color: activeTab === 'my' ? 'var(--color-primary)' : 'var(--color-slate-500)',
              transition: 'all 0.15s ease',
            }}
          >
            0
          </span>
        </button>
      </div>
    </section>
  )
}
