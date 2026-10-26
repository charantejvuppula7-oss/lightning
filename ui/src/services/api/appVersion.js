import { apiRequest } from './apiClient.js'

let versionRequest

export function getAppVersion() {
  if (!versionRequest) {
    versionRequest = apiRequest('/user/app-version/').then(({ version }) => {
      if (typeof version !== 'string' || !version) throw new Error('Invalid app version')
      return version
    }).catch(error => {
      versionRequest = null
      throw error
    })
  }
  return versionRequest
}
