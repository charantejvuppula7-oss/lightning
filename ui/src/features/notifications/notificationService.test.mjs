import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

test('an invalidation during an in-flight notification fetch queues one fresh response', async context => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  let unsubscribe = () => {}
  let server
  const window = Object.assign(new EventTarget(), { location: { origin: 'http://localhost:5173' } })
  Object.defineProperty(globalThis, 'window', { configurable: true, value: window })
  context.after(async () => {
    unsubscribe()
    await server?.close()
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow); else delete globalThis.window
  })
  server = await createServer({ root: fileURLToPath(new URL('../../../', import.meta.url)), server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
  const { notificationService } = await server.ssrLoadModule('/src/features/notifications/notificationService.js')
  const { getSharedSocket } = await server.ssrLoadModule('/src/features/chat/chatConnection.js')
  context.mock.method(getSharedSocket(), 'connect', function () { return this })
  const reads = []
  context.mock.method(globalThis, 'fetch', () => new Promise(resolve => reads.push(resolve)))
  const response = id => new Response(JSON.stringify({ results: [{ id, notification_type: 'task_assigned' }], next: null }), { headers: { 'Content-Type': 'application/json' } })
  const first = notificationService.getSnapshot()
  reads[0](response('original'))
  await first
  let latest
  unsubscribe = notificationService.subscribe(page => { latest = page.results[0].id })
  window.dispatchEvent(new Event('notifications:changed'))
  const pending = notificationService.getSnapshot()
  window.dispatchEvent(new Event('notifications:changed'))
  window.dispatchEvent(new Event('notifications:changed'))
  reads[1](response('stale'))
  await pending
  assert.equal(reads.length, 3)
  reads[2](response('fresh'))
  await notificationService.getSnapshot()
  assert.equal(latest, 'fresh')
})
