import { apiRequest } from './apiClient.js'

let versionRequest
let pending = false
const storageKey = 'lighting_v2_app_version'

export function storedAppVersion() {
  try {
    const version = localStorage.getItem(storageKey)
    return /^\d+\.\d+(?:\.\d+)?$/.test(version || '') ? version : null
  } catch { return null }
}

export function getAppVersion(refresh = false) {
  if (refresh && !pending) versionRequest = null
  if (!versionRequest) {
    pending = true
    versionRequest = apiRequest('/user/app-version/').then(({ version }) => {
      if (typeof version !== 'string' || !/^\d+\.\d+(?:\.\d+)?$/.test(version)) throw new Error('Invalid app version')
      try { localStorage.setItem(storageKey, version) } catch { /* Storage can be disabled. */ }
      return version
    }).catch(error => {
      versionRequest = null
      throw error
    }).finally(() => { pending = false })
  }
  return versionRequest
}
