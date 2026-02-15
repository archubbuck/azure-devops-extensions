import { useState, useEffect, useCallback } from 'react';
import { Notification, NotificationType } from '../types/notification';
import { NotificationService } from '../services/notification.service';
import NotificationItem from './NotificationItem';
import './NotificationPanel.css';

const log = (message: string, data?: unknown) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [NotificationPanel] ${message}`, data || '');
};

const error = (message: string, err?: unknown) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [NotificationPanel ERROR] ${message}`, err || '');
};

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  log(`NotificationPanel mounted. isOpen: ${isOpen}`);
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | NotificationType>('all');
  const notificationService = NotificationService.getInstance();

  const loadNotifications = useCallback(async () => {
    log('Starting to load notifications...');
    setLoading(true);
    try {
      const startTime = Date.now();
      const data = await notificationService.fetchNotifications();
      const duration = Date.now() - startTime;
      log(`Loaded ${data.length} notifications in ${duration}ms`);
      setNotifications(data);
    } catch (err) {
      error('Error loading notifications', err);
    } finally {
      setLoading(false);
      log('Loading complete');
    }
  }, [notificationService]);

  const applyFilter = useCallback(() => {
    let filtered = [...notifications];
    
    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.read);
    } else if (filter !== 'all') {
      filtered = filtered.filter(n => n.type === filter);
    }
    
    log(`Applied filter '${filter}': ${filtered.length} of ${notifications.length} notifications shown`);
    setFilteredNotifications(filtered);
  }, [notifications, filter]);

  useEffect(() => {
    log(`Panel visibility changed. isOpen: ${isOpen}`);
    if (isOpen) {
      log('Panel is open, triggering notification load');
      loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  useEffect(() => {
    applyFilter();
  }, [applyFilter]);

  const handleMarkAsRead = (id: string) => {
    log(`Marking notification as read: ${id}`);
    notificationService.markAsRead(id);
    setNotifications([...notificationService.getNotifications()]);
  };

  const handleMarkAllAsRead = () => {
    const unreadCount = notifications.filter(n => !n.read).length;
    log(`Marking all ${unreadCount} unread notifications as read`);
    notificationService.markAllAsRead();
    setNotifications([...notificationService.getNotifications()]);
  };

  if (!isOpen) {
    log('Panel is not open, returning null');
    return null;
  }

  log('Rendering panel UI');
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
            disabled={loading || notifications.every(n => n.read)}
          >
            ✓ Mark all as read
          </button>
        </div>

        <div className="filter-tabs">
          <button 
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
            disabled={loading && notifications.length === 0}
          >
            All ({loading && notifications.length === 0 ? '...' : notifications.length})
          </button>
          <button 
            className={`filter-tab ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
            disabled={loading && notifications.length === 0}
          >
            Unread ({loading && notifications.length === 0 ? '...' : notifications.filter(n => !n.read).length})
          </button>
          <button 
            className={`filter-tab ${filter === NotificationType.Mention ? 'active' : ''}`}
            onClick={() => setFilter(NotificationType.Mention)}
            disabled={loading && notifications.length === 0}
          >
            Mentions
          </button>
          <button 
            className={`filter-tab ${filter === NotificationType.PullRequestComment ? 'active' : ''}`}
            onClick={() => setFilter(NotificationType.PullRequestComment)}
            disabled={loading && notifications.length === 0}
          >
            PRs
          </button>
          <button 
            className={`filter-tab ${filter === NotificationType.WorkItemUpdate ? 'active' : ''}`}
            onClick={() => setFilter(NotificationType.WorkItemUpdate)}
            disabled={loading && notifications.length === 0}
          >
            Work Items
          </button>
        </div>

        <div className="notification-list">
          {loading && notifications.length === 0 && (
            <>
              <div className="skeleton-notification"></div>
              <div className="skeleton-notification"></div>
              <div className="skeleton-notification"></div>
              <div className="skeleton-notification"></div>
              <div className="skeleton-notification"></div>
            </>
          )}
          
          {!loading && filteredNotifications.length === 0 && (
            <div className="empty-state">
              <span role="img" aria-label="Empty mailbox" style={{ fontSize: '48px', marginBottom: '8px' }}>📭</span>
              <p>No notifications</p>
            </div>
          )}

          {(loading && notifications.length > 0 ? notifications : filteredNotifications).map(notification => (
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
