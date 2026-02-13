import { useEffect, useCallback } from 'react';
import { NotificationService } from '../services/notification.service';
import NotificationPanel from '../components/NotificationPanel';
import './app.css';

const log = (message: string, data?: unknown) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Notification Hub App] ${message}`, data || '');
};

const error = (message: string, err?: unknown) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [Notification Hub App ERROR] ${message}`, err || '');
};

export function App() {
  log('App component initializing...');
  
  const notificationService = NotificationService.getInstance();

  const refreshNotifications = useCallback(async () => {
    try {
      log('Refreshing notifications...');
      const startTime = Date.now();
      await notificationService.fetchNotifications();
      const duration = Date.now() - startTime;
      const count = notificationService.getUnreadCount();
      log(`Notifications refreshed in ${duration}ms. Unread count: ${count}`);
    } catch (err) {
      error('Failed to refresh notifications', err);
    }
  }, [notificationService]);

  useEffect(() => {
    log('App mounted, loading initial notifications');
    // Load notifications initially
    refreshNotifications();
  }, [refreshNotifications]);

  const handlePanelClose = () => {
    // Refresh notifications when panel closes
    refreshNotifications();
  };

  // When loaded as a panel, render the panel content directly
  // The panel is always "open" when this component is loaded in the panel context
  log('Rendering NotificationPanel component');
  return (
    <div className="notification-hub-app">
      <NotificationPanel isOpen={true} onClose={handlePanelClose} />
    </div>
  );
}

export default App;
