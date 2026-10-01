import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { confirmReset, getSession, login, logout, requestReset, verifyOtp } from '../src/features/auth/api/authApi.js'
import { authError } from '../src/utils/errors.js'

const originalFetch = globalThis.fetch
after(() => { globalThis.fetch = originalFetch })

test('cookie session, CSRF rotation, and reset payloads match Django auth API', async () => {
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options })
    if (url.endsWith('/auth/csrf/')) return Response.json({ csrfToken: 'initial' })
    if (url.endsWith('/auth/login/')) return Response.json({ user: { role: 'Project Manager' }, csrfToken: 'rotated' })
    if (url.endsWith('/auth/session/')) return Response.json({ user: { role: 'Project Manager' } })
    if (url.endsWith('/verify-otp/')) return Response.json({ reset_token: 'token' })
    if (url.endsWith('/confirm/')) return Response.json({ message: 'updated' })
    if (url.endsWith('/password-reset/request/')) return Response.json({ account_exists: true, code_sent: true })
    return Response.json({ message: 'ok' })
  }

  const session = await login('ravi', 'secret')
  assert.equal(session.user.role, 'Project Manager')
  assert.equal(calls[0].url, '/api/auth/csrf/')
  assert.equal(calls[1].options.headers['X-CSRFToken'], 'initial')

  await getSession()

  await requestReset('ravi')
  assert.equal(calls[3].options.headers['X-CSRFToken'], 'rotated')
  assert.equal(JSON.parse(calls[3].options.body).identifier, 'ravi')

  await verifyOtp('ravi', '123456')
  assert.equal(JSON.parse(calls[4].options.body).otp_code, '123456')

  await confirmReset('token', 'NewPass123!')
  assert.equal(JSON.parse(calls[5].options.body).reset_token, 'token')

  await logout()
  assert.equal(calls[6].options.method, 'POST')
})

test('backend errors keep their status and field errors', async () => {
  globalThis.fetch = async (url) => url.endsWith('/auth/csrf/')
    ? Response.json({ csrfToken: 'initial' })
    : Response.json({ detail: 'Invalid credentials.' }, { status: 401 })
  await assert.rejects(login('unknown', 'wrong'), (error) => error.status === 401 && error.data.detail === 'Invalid credentials.')
})

test('reset request surfaces unknown users and failed delivery', async () => {
  globalThis.fetch = async (url) => url.endsWith('/auth/csrf/')
    ? Response.json({ csrfToken: 'initial' })
    : Response.json({ identifier: ['No active account was found.'] }, { status: 400 })
  await assert.rejects(requestReset('unknown'), (error) =>
    error.status === 400 && authError(error, 'fallback') === 'No active account was found.')

  globalThis.fetch = async () => Response.json({ detail: 'Unable to send the verification code. Please try again later.' }, { status: 503 })
  await assert.rejects(requestReset('known'), (error) =>
    error.status === 503 && authError(error, 'fallback').startsWith('Unable to send'))
})

test('reset request rejects a generic success response', async () => {
  globalThis.fetch = async () => Response.json({ message: 'If the account exists, a verification code has been sent.' })
  await assert.rejects(requestReset('unknown'), (error) =>
    authError(error, 'fallback') === 'We could not verify this account. Please try again later.')
})
