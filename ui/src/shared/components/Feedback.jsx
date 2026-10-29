import { useEffect, useMemo, useState } from 'react'

export function useFeedback() {
  const [message, setMessage] = useState(null)
  const toast = useMemo(() => ({
    success: text => setMessage({ text, error: false }),
    info: text => setMessage({ text, error: false }),
    error: text => setMessage({ text, error: true }),
  }), [])
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(null), 2000)
    return () => clearTimeout(timer)
  }, [message])
  const feedback = message && <div role={message.error ? 'alert' : 'status'} className="fixed! top-[24px]! right-[24px]! z-[10000]! flex! items-center! gap-[12px]! max-w-[calc(100vw_-_32px)]! rounded-[8px]! border! border-[#e2e8f0]! bg-white! p-[12px_16px]! text-[13px]! text-[#0f172a]! shadow-lg!">
    <span aria-hidden="true" className={`material-symbols-outlined text-[20px]! ${message.error ? 'text-red-600!' : 'text-green-600!'}`}>{message.error ? 'error' : 'check_circle'}</span>
    {message.text}<button type="button" aria-label="Dismiss message" onClick={() => setMessage(null)}>×</button>
  </div>
  return { toast, feedback }
}
