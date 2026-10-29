import assert from 'node:assert/strict'
import test from 'node:test'
import { apiList, apiRequest, apiUpload, clearCsrf } from './apiClient.js'

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
function mockWindow(context) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const window = new EventTarget()
  Object.defineProperty(globalThis, 'window', { configurable: true, value: window })
  context.after(() => { if (original) Object.defineProperty(globalThis, 'window', original); else delete globalThis.window })
  return window
}

test('parallel writes share one CSRF request and retain their own bodies', async context => {
  clearCsrf()
  mockWindow(context)
  let csrfCalls = 0
  const writes = []
  context.mock.method(globalThis, 'fetch', async (path, options) => {
    if (path.endsWith('/auth/csrf/')) { csrfCalls++; return json({ csrfToken: 'test-token' }) }
    writes.push(options)
    return json({ ok: true })
  })
  await Promise.all([apiRequest('/tasks/', { method: 'POST', body: { name: 'one' } }),
    apiRequest('/tasks/', { method: 'POST', body: { name: 'two' } })])
  assert.equal(csrfCalls, 1)
  assert.deepEqual(writes.map(write => JSON.parse(write.body).name), ['one', 'two'])
  assert.ok(writes.every(write => write.headers['X-CSRFToken'] === 'test-token'))
})

test('pagination collects every page without another caller-specific loop', async context => {
  const paths = []
  context.mock.method(globalThis, 'fetch', async path => {
    paths.push(path)
    return json(path.endsWith('page=1') ? { results: [1], next: '/api/tasks/?page=2' } : { results: [2], next: null })
  })
  assert.deepEqual(await apiList('/tasks/?page_size=1'), [1, 2])
  assert.equal(paths.length, 2)
})

test('multipart errors clear the cached CSRF token and atomic project edits refresh notifications once', async context => {
  clearCsrf()
  const window = mockWindow(context)
  let csrfCalls = 0
  let changes = 0
  window.addEventListener('notifications:changed', () => changes++)
  context.mock.method(globalThis, 'fetch', async path => {
    if (path.endsWith('/auth/csrf/')) { csrfCalls++; return json({ csrfToken: 'test-token' }) }
    return path.endsWith('/documents/') ? json({ detail: 'Denied' }, 403) : json({ ok: true })
  })
  await assert.rejects(apiUpload('/documents/', new FormData()), error => error.status === 403)
  await apiRequest('/projects/example/update/', { method: 'PATCH', body: { changes: [] } })
  assert.equal(csrfCalls, 2)
  assert.equal(changes, 1)
})
