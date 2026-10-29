const API_BASE = (import.meta.env?.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
let csrfToken = null
let csrfRequest = null

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
  if (!csrfRequest) {
    const request = fetch(`${API_BASE}/auth/csrf/`, { credentials: 'include' }).then(readResponse).then(data => {
      if (csrfRequest === request) csrfToken = data.csrfToken
      return data.csrfToken
    }).finally(() => { if (csrfRequest === request) csrfRequest = null })
    csrfRequest = request
  }
  return csrfRequest
}

export async function apiFetch(path, options = {}) {
  const method = options.method || 'GET'
  const headers = { ...options.headers }
  if (!['GET', 'HEAD'].includes(method)) headers['X-CSRFToken'] = await csrf()
  const response = await fetch(`${API_BASE}${path}`, { ...options, method, credentials: 'include', headers })
  if (response.ok && !['GET', 'HEAD'].includes(method) &&
      (/^\/(tasks|dependencies|approvals)\//.test(path) || /^\/projects\/[^/]+\/update\/$/.test(path))) {
    window.dispatchEvent(new Event('notifications:changed'))
  }
  return response
}

async function readResponse(response) {
  const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : null
  if (!response.ok) {
    if (response.status === 403) csrfToken = null
    throw new ApiError(response.status, data, response.headers.get('Retry-After'))
  }
  return data
}

export async function apiRequest(path, { method = 'GET', body, signal } = {}) {
  const data = await readResponse(await apiFetch(path, {
    method,
    signal,
    ...(body !== undefined ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  }))
  if (data?.csrfToken) csrfToken = data.csrfToken
  return data
}

export async function apiUpload(path, formData, { method = 'POST' } = {}) {
  return readResponse(await apiFetch(path, { method, body: formData }))
}

export function clearCsrf() { csrfToken = null; csrfRequest = null }

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
  if (typeof error.data === 'string') return error.data
  return Object.entries(error.data).map(([key, value]) => `${key === 'detail' ? '' : `${key}: `}${Array.isArray(value) ? value.join(' ') : typeof value === 'object' ? JSON.stringify(value) : value}`).join(' ')
}
