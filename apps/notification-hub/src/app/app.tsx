import { useState, useEffect, useCallback } from 'react';
import { NotificationService } from '../services/notification.service';
import NotificationBell from '../components/NotificationBell';
import NotificationPanel from '../components/NotificationPanel';
import './app.css';

export function App() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationService = NotificationService.getInstance();

  const updateUnreadCount = useCallback(async () => {
    await notificationService.fetchNotifications();
    setUnreadCount(notificationService.getUnreadCount());
  }, [notificationService]);

  useEffect(() => {
    // Load notifications and update unread count periodically
    updateUnreadCount();
    const interval = setInterval(updateUnreadCount, 60000); // Update every minute

    return () => clearInterval(interval);
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
