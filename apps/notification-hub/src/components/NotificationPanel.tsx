import { useState, useEffect, useCallback } from 'react';
import { Notification, NotificationType } from '../types/notification';
import { NotificationService } from '../services/notification.service';
import NotificationItem from './NotificationItem';
import './NotificationPanel.css';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | NotificationType>('all');
  const notificationService = NotificationService.getInstance();

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationService.fetchNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [notificationService]);

  const applyFilter = useCallback(() => {
    let filtered = [...notifications];
    
    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.read);
    } else if (filter !== 'all') {
      filtered = filtered.filter(n => n.type === filter);
    }
    
    setFilteredNotifications(filtered);
  }, [notifications, filter]);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  useEffect(() => {
    applyFilter();
  }, [applyFilter]);

  const handleMarkAsRead = (id: string) => {
    notificationService.markAsRead(id);
    setNotifications([...notificationService.getNotifications()]);
  };

  const handleMarkAllAsRead = () => {
    notificationService.markAllAsRead();
    setNotifications([...notificationService.getNotifications()]);
  };

  if (!isOpen) return null;

  return (
    <div className="notification-panel">
      <div className="panel-header">
        <h2>Notifications</h2>
      </div>

        <div className="panel-actions">
          <button 
            className="refresh-button" 
            onClick={loadNotifications}
            disabled={loading}
          >
            {loading ? '⏳' : '🔄'} Refresh
          </button>
          <button 
            className="mark-all-read-button" 
            onClick={handleMarkAllAsRead}
            disabled={notifications.every(n => n.read)}
          >
            ✓ Mark all as read
          </button>
        </div>

        <div className="filter-tabs">
          <button 
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({notifications.length})
          </button>
          <button 
            className={`filter-tab ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread ({notifications.filter(n => !n.read).length})
          </button>
          <button 
            className={`filter-tab ${filter === NotificationType.Mention ? 'active' : ''}`}
            onClick={() => setFilter(NotificationType.Mention)}
          >
            Mentions
          </button>
          <button 
            className={`filter-tab ${filter === NotificationType.PullRequestComment ? 'active' : ''}`}
            onClick={() => setFilter(NotificationType.PullRequestComment)}
          >
            PRs
          </button>
          <button 
            className={`filter-tab ${filter === NotificationType.WorkItemUpdate ? 'active' : ''}`}
            onClick={() => setFilter(NotificationType.WorkItemUpdate)}
          >
            Work Items
          </button>
        </div>

        <div className="notification-list">
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading notifications...</p>
            </div>
          )}
          
          {!loading && filteredNotifications.length === 0 && (
            <div className="empty-state">
              <span role="img" aria-label="Empty mailbox" style={{ fontSize: '48px', marginBottom: '8px' }}>📭</span>
              <p>No notifications</p>
            </div>
          )}

          {!loading && filteredNotifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
            />
          ))}
        </div>
    </div>
  );
};

export default NotificationPanel;
