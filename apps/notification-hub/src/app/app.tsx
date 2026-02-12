import { useEffect, useCallback } from 'react';
import { NotificationService } from '../services/notification.service';
import NotificationPanel from '../components/NotificationPanel';
import './app.css';

const log = (message: string, data?: unknown) => {
  console.log(`[Notification Hub App] ${message}`, data || '');
};

export function App() {
  const notificationService = NotificationService.getInstance();

  const refreshNotifications = useCallback(async () => {
    try {
      log('Refreshing notifications...');
      await notificationService.fetchNotifications();
      const count = notificationService.getUnreadCount();
      log(`Notifications refreshed. Unread count: ${count}`);
    } catch (err) {
      console.error('[Notification Hub App] Failed to refresh notifications', err);
    }
  }, [notificationService]);

  useEffect(() => {
    log('App mounted, starting notification refresh');
    // Load notifications initially and refresh periodically
    refreshNotifications();
    const interval = setInterval(refreshNotifications, 60000); // Refresh every minute

    return () => {
      log('App unmounting, clearing interval');
      clearInterval(interval);
    };
  }, [refreshNotifications]);

  const handlePanelClose = () => {
    // Refresh notifications when panel closes
    refreshNotifications();
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
