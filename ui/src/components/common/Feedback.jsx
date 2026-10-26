import { useMemo, useState } from 'react'

export function useFeedback() {
  const [message, setMessage] = useState(null)
  const toast = useMemo(() => ({
    success: text => setMessage({ text, error: false }),
    info: text => setMessage({ text, error: false }),
    error: text => setMessage({ text, error: true }),
  }), [])
  const feedback = message && <div role={message.error ? 'alert' : 'status'} style={{ padding: 12, marginBottom: 16, borderRadius: 8, background: message.error ? '#fef2f2' : '#f0fdf4', color: message.error ? '#991b1b' : '#166534', display: 'flex', justifyContent: 'space-between', gap: 16 }}>
    {message.text}<button type="button" aria-label="Dismiss message" onClick={() => setMessage(null)}>×</button>
  </div>
  return { toast, feedback }
}
