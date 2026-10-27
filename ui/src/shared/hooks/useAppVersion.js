import { useEffect, useState } from 'react'
import packageInfo from '../../../package.json'
import { getAppVersion, storedAppVersion } from '../api/appVersion.js'

export default function useAppVersion() {
  const [version, setVersion] = useState(() => storedAppVersion() || packageInfo.version)
  useEffect(() => {
    let active = true
    const load = (refresh = false) => getAppVersion(refresh).then(value => { if (active) setVersion(value) }).catch(() => {
      // Keep the installed release version when the server is unavailable.
    })
    load()
    const onUpdate = () => load(true)
    const onStorage = event => {
      if (event.key === 'lighting_v2_app_version') {
        const current = storedAppVersion()
        if (current) setVersion(current)
      }
    }
    window.addEventListener('app:updated', onUpdate)
    window.addEventListener('storage', onStorage)
    return () => {
      active = false
      window.removeEventListener('app:updated', onUpdate)
      window.removeEventListener('storage', onStorage)
    }
  }, [])
  return version
}
