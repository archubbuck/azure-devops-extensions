import { useEffect, useCallback, useRef } from 'react';
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

interface AppProps {
  onReady?: () => void;
}

export function App({ onReady }: AppProps) {
  log('App component initializing...');
  
  const notificationService = NotificationService.getInstance();
  const hasNotifiedReady = useRef(false);

  const refreshNotifications = useCallback(async () => {
    try {
      log('Refreshing notifications...');
      const startTime = Date.now();
      await notificationService.fetchNotifications();
      const duration = Date.now() - startTime;
      const count = notificationService.getUnreadCount();
      log(`Notifications refreshed in ${duration}ms. Unread count: ${count}`);
      
      // Notify that the app is ready after initial load
      if (!hasNotifiedReady.current && onReady) {
        hasNotifiedReady.current = true;
        onReady();
      }
    } catch (err) {
      error('Failed to refresh notifications', err);
      
      // Still notify ready even on error so the extension doesn't hang
      if (!hasNotifiedReady.current && onReady) {
        hasNotifiedReady.current = true;
        onReady();
      }
    }
  }, [notificationService, onReady]);

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
