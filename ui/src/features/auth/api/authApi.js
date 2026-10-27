import { apiRequest, clearCsrf } from '../../../shared/api/apiClient.js'
import { resetNotificationCache } from '../../notifications/notificationService.js'

let sessionRequest
export async function login(identifier, password) {
  const data = await apiRequest('/auth/login/', { method: 'POST', body: { identifier, password } })
  resetNotificationCache()
  sessionRequest = null
  window.dispatchEvent(new Event('session:changed'))
  return data
}
export function getSession() {
  if (!sessionRequest) {
    const request = apiRequest('/auth/session/').finally(() => { if (sessionRequest === request) sessionRequest = null })
    sessionRequest = request
  }
  return sessionRequest
}
export async function logout() {
  await apiRequest('/auth/logout/', { method: 'POST' })
  clearCsrf()
  resetNotificationCache()
  sessionRequest = null
  window.dispatchEvent(new Event('session:changed'))
}
export async function requestReset(identifier) {
  const data = await apiRequest('/auth/password-reset/request/', { method: 'POST', body: { identifier } })
  if (data?.account_exists !== true || data?.code_sent !== true) throw new Error('Unconfirmed password reset response')
  return data
}
export const verifyOtp = (identifier, otp_code) => apiRequest('/auth/password-reset/verify-otp/', { method: 'POST', body: { identifier, otp_code } })
export const confirmReset = (reset_token, new_password) => apiRequest('/auth/password-reset/confirm/', { method: 'POST', body: { reset_token, new_password } })
