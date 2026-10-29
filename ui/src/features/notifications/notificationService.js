import { apiRequest } from '../../shared/api/apiClient.js';
import { getSharedSocket, retainSocket } from '../chat/chatConnection.js';

function normalize(notification) {
  return {
    ...notification,
    type: notification.notification_type,
    timestamp: notification.created_at,
  };
}

let snapshot = null;
let pending = null;
let refreshQueued = false;
let updatedAt = 0;
let generation = 0;
let releaseSocket = null;
const listeners = new Set();

export function resetNotificationCache() {
  generation += 1;
  snapshot = null;
  pending = null;
  refreshQueued = false;
  updatedAt = 0;
}

async function getSnapshot(force = false) {
  if (pending) return pending;
  if (!force && snapshot && Date.now() - updatedAt < 15000) return snapshot;
  const current = generation;
  const request = apiRequest('/notifications/?page_size=100').then(page => {
    if (current !== generation) throw new DOMException('Session changed', 'AbortError');
    snapshot = { ...page, results: page.results.map(normalize) };
    updatedAt = Date.now();
    listeners.forEach(listener => listener(snapshot));
    return snapshot;
  }).finally(() => {
    if (pending === request) {
      pending = null;
      if (refreshQueued) { refreshQueued = false; refresh(); }
    }
  });
  pending = request;
  return request;
}

const refresh = () => {
  if (pending) { refreshQueued = true; return; }
  getSnapshot(true).catch(() => {});
};

export const notificationService = {
  getSnapshot,

  subscribe(listener) {
    listeners.add(listener);
    if (listeners.size === 1) {
      const socket = getSharedSocket();
      socket.on('notifications_changed', refresh);
      socket.on('connect', refresh);
      releaseSocket = retainSocket();
      window.addEventListener('notifications:changed', refresh);
    }
    return () => {
      listeners.delete(listener);
      if (!listeners.size) {
        getSharedSocket().off('notifications_changed', refresh);
        getSharedSocket().off('connect', refresh);
        releaseSocket();
        releaseSocket = null;
        window.removeEventListener('notifications:changed', refresh);
      }
    };
  },

  async getNotifications() {
    const first = await getSnapshot();
    const items = [...first.results];
    let path = first.next;
    while (path) {
      const page = await apiRequest(`/notifications/${new URL(path, window.location.origin).search}`);
      items.push(...page.results.map(normalize));
      path = page.next;
    }
    return items;
  },

  async markAsRead(id) {
    const data = await apiRequest(`/notifications/${encodeURIComponent(id)}/read/`, { method: 'PATCH' });
    resetNotificationCache();
    window.dispatchEvent(new Event('notifications:changed'));
    return normalize(data);
  },

  async markAllRead() {
    const data = await apiRequest('/notifications/mark-all-read/', { method: 'PATCH' });
    resetNotificationCache();
    window.dispatchEvent(new Event('notifications:changed'));
    return data;
  },
};
