import { useState } from 'react'

export default function DependenciesPage({ user }) {
  const userRole = String(user?.role || '').toLowerCase()
  const isUserRole = !['admin', 'administrator', 'pm', 'project manager'].includes(userRole)
  const [activeTab, setActiveTab] = useState(() => (isUserRole ? 'waiting_on_other' : 'all'))

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
          Dependencies
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
          Every link between your work and someone else's, in both directions.
        </p>
      </header>

      {/* Tabs: All Dependencies / You're waiting on / Waiting on you */}
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
            All Dependencies (17)
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('waiting_on_other')}
          style={{
            background: 'none',
            border: 'none',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: activeTab === 'waiting_on_other' ? '700' : '500',
            color: activeTab === 'waiting_on_other' ? 'var(--color-primary)' : 'var(--color-slate-500)',
            borderBottom: activeTab === 'waiting_on_other' ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
            marginBottom: '-1px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          You're waiting on (0)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('waiting_on_you')}
          style={{
            background: 'none',
            border: 'none',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: activeTab === 'waiting_on_you' ? '700' : '500',
            color: activeTab === 'waiting_on_you' ? 'var(--color-primary)' : 'var(--color-slate-500)',
            borderBottom: activeTab === 'waiting_on_you' ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
            marginBottom: '-1px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          Waiting on you (4)
        </button>
      </div>
    </section>
  )
}
