const API_BASE = (import.meta.env?.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
let csrfToken = null

export class ApiError extends Error {
  constructor(status, data) {
    super('API request failed')
    this.status = status
    this.data = data
  }
}

async function csrf() {
  if (csrfToken) return csrfToken
  const response = await fetch(`${API_BASE}/auth/csrf/`, { credentials: 'include' })
  if (!response.ok) throw new ApiError(response.status)
  csrfToken = (await response.json()).csrfToken
  return csrfToken
}

export async function apiRequest(path, { method = 'GET', body } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (!['GET', 'HEAD'].includes(method)) headers['X-CSRFToken'] = await csrf()
  const response = await fetch(`${API_BASE}${path}`, {
    method, credentials: 'include', headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await response.json() : null
  if (!response.ok) {
    if (response.status === 403) csrfToken = null
    throw new ApiError(response.status, data)
  }
  if (data?.csrfToken) csrfToken = data.csrfToken
  return data
}

export function clearCsrf() { csrfToken = null }
