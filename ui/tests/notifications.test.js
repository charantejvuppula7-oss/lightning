import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { notificationService } from '../src/features/notifications/notificationService.js';

const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
after(() => {
  globalThis.fetch = originalFetch;
  globalThis.window = originalWindow;
});

test('notification service reads paginated Django data and sends PATCH with CSRF', async () => {
  const calls = [];
  const events = [];
  globalThis.window = {
    location: { origin: 'http://localhost' },
    dispatchEvent: (event) => events.push(event.type),
  };
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url === '/api/notifications/?page_size=100') return Response.json({
      results: [{ id: 'first', notification_type: 'task_assigned', created_at: '2026-10-01T00:00:00Z' }],
      next: 'http://localhost/api/notifications/?page=2',
    });
    if (url === '/api/notifications/?page=2') return Response.json({
      results: [{ id: 'second', notification_type: 'chat_mention', created_at: '2026-10-01T01:00:00Z' }],
      next: null,
    });
    if (url === '/api/notifications/unread-count/') return Response.json({ count: 2 });
    if (url === '/api/auth/csrf/') return Response.json({ csrfToken: 'csrf-token' });
    return Response.json({ id: 'first', notification_type: 'task_assigned', created_at: '2026-10-01T00:00:00Z' });
  };

  const notifications = await notificationService.getNotifications();
  assert.deepEqual(notifications.map((item) => item.id), ['first', 'second']);
  assert.equal(notifications[1].type, 'chat_mention');
  assert.equal(notifications[1].timestamp, '2026-10-01T01:00:00Z');
  assert.equal(await notificationService.getUnreadCount(), 2);
  await notificationService.markAsRead('first');
  await notificationService.markAllRead();

  const writes = calls.filter((call) => call.options.method === 'PATCH');
  assert.deepEqual(writes.map((call) => call.url), [
    '/api/notifications/first/read/', '/api/notifications/mark-all-read/',
  ]);
  assert.ok(writes.every((call) => Boolean(call.options.headers['X-CSRFToken'])));
  assert.deepEqual(events, ['notifications:changed', 'notifications:changed']);
});
