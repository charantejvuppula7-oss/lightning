import { useEffect, useState } from 'react'
import packageInfo from '../../../package.json'
import { getAppVersion } from '../../services/api/appVersion.js'

export default function useAppVersion() {
  const [version, setVersion] = useState(packageInfo.version)
  useEffect(() => {
    let active = true
    getAppVersion().then(value => { if (active) setVersion(value) }).catch(() => {
      // Keep the installed release version when the server is unavailable.
    })
    return () => { active = false }
  }, [])
  return version
}
