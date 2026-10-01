export function authError(error, fallback) {
  if (error.message === 'Unexpected server response') return 'The server returned an unexpected response. Please try again.'
  if (!error.status) return 'Unable to reach the server. Check your connection and try again.'
  if (error.status === 503) return error.data?.detail || 'Unable to send the verification code. Please try again later.'
  if (error.status >= 500) return 'The server is unavailable. Please try again later.'
  if (error.status === 429) return 'Too many attempts. Please wait and try again.'
  const data = error.data || {}
  const value = data.detail || data.message || data.identifier || data.password || data.otp_code || data.reset_token || data.new_password
  return Array.isArray(value) ? value.join(' ') : typeof value === 'string' ? value : fallback
}
