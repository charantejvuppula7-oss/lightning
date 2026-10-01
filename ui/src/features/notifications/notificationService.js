import { apiRequest } from '../../services/api/apiClient.js';

function normalize(notification) {
  return {
    ...notification,
    type: notification.notification_type,
    timestamp: notification.created_at,
  };
}

async function getPage(path = '/notifications/?page_size=100') {
  return apiRequest(path);
}

export const notificationService = {
  async getNotifications() {
    const items = [];
    let path = '/notifications/?page_size=100';
    while (path) {
      const page = await getPage(path);
      items.push(...page.results.map(normalize));
      path = page.next ? `/notifications/${new URL(page.next, window.location.origin).search}` : null;
    }
    return items;
  },

  async getRecentNotifications() {
    const page = await getPage();
    return page.results.map(normalize);
  },

  async getUnreadCount() {
    const data = await apiRequest('/notifications/unread-count/');
    return data.count;
  },

  async markAsRead(id) {
    const data = await apiRequest(`/notifications/${encodeURIComponent(id)}/read/`, { method: 'PATCH' });
    window.dispatchEvent(new Event('notifications:changed'));
    return normalize(data);
  },

  async markAllRead() {
    const data = await apiRequest('/notifications/mark-all-read/', { method: 'PATCH' });
    window.dispatchEvent(new Event('notifications:changed'));
    return data;
  },
};
