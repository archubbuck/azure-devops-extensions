import { useEffect, useCallback } from 'react';
import { NotificationService } from '../services/notification.service';
import NotificationPanel from '../components/NotificationPanel';
import './app.css';

const log = (message: string, data?: unknown) => {
  console.log(`[Notification Hub App] ${message}`, data || '');
};

export function App() {
  const notificationService = NotificationService.getInstance();

  const updateNotifications = useCallback(async () => {
    try {
      log('Fetching notifications...');
      await notificationService.fetchNotifications();
      const count = notificationService.getUnreadCount();
      log(`Updated unread count: ${count}`);
    } catch (err) {
      console.error('[Notification Hub App] Failed to update notifications', err);
    }
  }, [notificationService]);

  useEffect(() => {
    log('App mounted, starting notification updates');
    // Load notifications and update unread count periodically
    updateNotifications();
    const interval = setInterval(updateNotifications, 60000); // Update every minute

    return () => {
      log('App unmounting, clearing interval');
      clearInterval(interval);
    };
  }, [updateNotifications]);

  const handlePanelClose = () => {
    // Refresh notifications when panel closes to update unread count
    updateNotifications();
  };

  // When loaded as a panel, render the panel content directly
  // The panel is always "open" when this component is loaded in the panel context
  return (
    <div className="notification-hub-app">
      <NotificationPanel isOpen={true} onClose={handlePanelClose} />
    </div>
  );
}

export default App;
