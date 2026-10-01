import { apiRequest, clearCsrf } from '../../../services/api/apiClient.js'

export const login = (identifier, password) => apiRequest('/auth/login/', { method: 'POST', body: { identifier, password } })
export const getSession = () => apiRequest('/auth/session/')
export async function logout() {
  await apiRequest('/auth/logout/', { method: 'POST' })
  clearCsrf()
}
export async function requestReset(identifier) {
  const data = await apiRequest('/auth/password-reset/request/', { method: 'POST', body: { identifier } })
  if (data?.account_exists !== true || data?.code_sent !== true) throw new Error('Unconfirmed password reset response')
  return data
}
export const verifyOtp = (identifier, otp_code) => apiRequest('/auth/password-reset/verify-otp/', { method: 'POST', body: { identifier, otp_code } })
export const confirmReset = (reset_token, new_password) => apiRequest('/auth/password-reset/confirm/', { method: 'POST', body: { reset_token, new_password } })
