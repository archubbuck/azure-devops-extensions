import { useState, useEffect, useCallback } from 'react';
import { NotificationService } from '../services/notification.service';
import NotificationBell from '../components/NotificationBell';
import NotificationPanel from '../components/NotificationPanel';
import './app.css';

const log = (message: string, data?: unknown) => {
  console.log(`[Notification Hub App] ${message}`, data || '');
};

export function App() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationService = NotificationService.getInstance();

  const updateUnreadCount = useCallback(async () => {
    try {
      log('Fetching notifications...');
      await notificationService.fetchNotifications();
      const count = notificationService.getUnreadCount();
      setUnreadCount(count);
      log(`Updated unread count: ${count}`);
    } catch (err) {
      console.error('[Notification Hub App] Failed to update notifications', err);
    }
  }, [notificationService]);

  useEffect(() => {
    log('App mounted, starting notification updates');
    // Load notifications and update unread count periodically
    updateUnreadCount();
    const interval = setInterval(updateUnreadCount, 60000); // Update every minute

    return () => {
      log('App unmounting, clearing interval');
      clearInterval(interval);
    };
  }, [updateUnreadCount]);

  const handleBellClick = () => {
    setIsPanelOpen(!isPanelOpen);
  };

  const handlePanelClose = () => {
    setIsPanelOpen(false);
    setUnreadCount(notificationService.getUnreadCount());
  };

  return (
    <div className="notification-hub-app">
      <div className="header">
        <h1>Notification Hub</h1>
        <NotificationBell unreadCount={unreadCount} onClick={handleBellClick} />
      </div>
      <NotificationPanel isOpen={isPanelOpen} onClose={handlePanelClose} />
    </div>
  );
}

export default App;
