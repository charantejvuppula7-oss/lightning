import NotificationView from './NotificationView.jsx';

export default function NotificationsPage({ searchQuery }) {
  return (
    <div style={{ padding: '24px 32px 60px', backgroundColor: '#F9FBFF', minHeight: 'calc(100dvh - 50px)' }}>
      <div style={{ width: '100%', maxWidth: '1280px', margin: '0 auto' }}>
        <NotificationView searchQuery={searchQuery} />
      </div>
    </div>
  );
}
