import { useEffect, useState } from 'react'
import { getSession } from '../../features/auth/api/authApi.js'

export default function useSession() {
  const [state, setState] = useState({ status: 'loading', user: null })
  useEffect(() => {
    let active = true
    const load = () => getSession().then((data) => {
      if (active) setState(data?.user ? { status: 'authenticated', user: data.user } : { status: 'unauthenticated', user: null })
    }).catch((error) => {
      if (active) setState({ status: error.status === 401 || error.status === 403 ? 'unauthenticated' : 'unavailable', user: null })
    })
    load()
    window.addEventListener('session:changed',load)
    return () => { active = false; window.removeEventListener('session:changed',load) }
  }, [])
  return state
}
