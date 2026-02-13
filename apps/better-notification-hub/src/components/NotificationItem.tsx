import { Notification, NotificationType } from '../types/notification';
import './NotificationItem.css';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onMarkAsRead }) => {
  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.Mention:
        return '💬';
      case NotificationType.PullRequestComment:
        return '💭';
      case NotificationType.WorkItemUpdate:
      case NotificationType.WorkItemAssignment:
      case NotificationType.WorkItemStateChange:
        return '📋';
      default:
        return '🔔';
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    if (notification.url) {
      window.open(notification.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <div 
      className={`notification-item ${!notification.read ? 'unread' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="notification-icon">
        {getTypeIcon(notification.type)}
      </div>
      <div className="notification-content">
        <div className="notification-header">
          <span className="notification-title">{notification.title}</span>
          <span className="notification-time">{getTimeAgo(notification.timestamp)}</span>
        </div>
        <div className="notification-description">{notification.description}</div>
        {notification.author && (
          <div className="notification-author">
            {notification.author.imageUrl && (
              <img 
                src={notification.author.imageUrl} 
                alt={notification.author.displayName}
                className="author-avatar"
              />
            )}
            <span className="author-name">{notification.author.displayName}</span>
          </div>
        )}
      </div>
      {!notification.read && <div className="unread-indicator" />}
    </div>
  );
};

export default NotificationItem;
