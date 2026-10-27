import { useEffect, useState } from 'react'

export function readRetryDeadline(key) {
  try { return Number(sessionStorage.getItem(key)) || 0 } catch { return 0 }
}

export function saveRetryDeadline(key, seconds) {
  const deadline = Date.now() + Math.max(0, Math.ceil(Number(seconds) || 0)) * 1000
  try { sessionStorage.setItem(key, String(deadline)) } catch { /* Timer still works without storage. */ }
  return deadline
}

export function retrySeconds(deadline, now = Date.now()) {
  return Math.max(0, Math.ceil((deadline - now) / 1000))
}

export default function useRetryTimer(key) {
  const [deadline, setDeadline] = useState(() => readRetryDeadline(key))
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    // Route changes select a different server-enforced cooldown.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDeadline(readRetryDeadline(key))
    setNow(Date.now())
  }, [key])
  useEffect(() => {
    if (!deadline || deadline <= Date.now()) return
    const timer = setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= deadline) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [deadline])
  const start = seconds => { setDeadline(saveRetryDeadline(key, seconds)); setNow(Date.now()) }
  return { remaining: retrySeconds(deadline, now), start }
}
