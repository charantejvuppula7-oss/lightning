import NotificationView from './NotificationView.jsx';

export default function NotificationsPage({ searchQuery }) {
  return (
    <div className="p-[24px_32px_60px]! [background-color:#F9FBFF]! min-h-[calc(100dvh_-_50px)]!">
      <div className="w-full! max-w-[1280px]! m-[0_auto]!">
        <NotificationView searchQuery={searchQuery} />
      </div>
    </div>
  );
}
