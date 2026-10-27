const API_BASE = (import.meta.env?.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
let csrfToken = null

export class ApiError extends Error {
  constructor(status, data, retryAfter = 0) {
    super('API request failed')
    this.status = status
    this.data = data
    this.retryAfter = Math.max(0, Number(retryAfter || data?.retry_after) || 0)
  }
}

async function csrf() {
  if (csrfToken) return csrfToken
  const response = await fetch(`${API_BASE}/auth/csrf/`, { credentials: 'include' })
  if (!response.ok) {
    const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : null
    throw new ApiError(response.status, data, response.headers.get('Retry-After'))
  }
  csrfToken = (await response.json()).csrfToken
  return csrfToken
}

export async function apiFetch(path, options = {}) {
  const method = options.method || 'GET'
  const headers = { ...options.headers }
  if (!['GET', 'HEAD'].includes(method)) headers['X-CSRFToken'] = await csrf()
  return fetch(`${API_BASE}${path}`, { ...options, method, credentials: 'include', headers })
}

export async function apiRequest(path, { method = 'GET', body, signal } = {}) {
  const response = await apiFetch(path, {
    method,
    signal,
    ...(body !== undefined ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  })
  const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : null
  if (!response.ok) {
    if (response.status === 403) csrfToken = null
    throw new ApiError(response.status, data, response.headers.get('Retry-After'))
  }
  if (data?.csrfToken) csrfToken = data.csrfToken
  return data
}

export async function apiUpload(path, formData, { method = 'POST' } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method, credentials: 'include',
    headers: { 'X-CSRFToken': await csrf() }, body: formData,
  })
  const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : null
  if (!response.ok) throw new ApiError(response.status, data, response.headers.get('Retry-After'))
  return data
}

export function clearCsrf() { csrfToken = null }

export async function apiList(path, { signal } = {}) {
  const rows = []
  let page = 1
  while (true) {
    const data = await apiRequest(`${path}${path.includes('?') ? '&' : '?'}page=${page}`, { signal })
    rows.push(...(Array.isArray(data) ? data : data.results || []))
    if (!data.next) return rows
    page += 1
  }
}

export function errorMessage(error) {
  if (!error.data) return error.message || 'Request failed. Please try again.'
  return Object.entries(error.data).map(([key, value]) => `${key === 'detail' ? '' : `${key}: `}${Array.isArray(value) ? value.join(' ') : value}`).join(' ')
}
