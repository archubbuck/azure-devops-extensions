export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  url?: string;
  projectId?: string;
  projectName?: string;
  repositoryId?: string;
  repositoryName?: string;
  workItemId?: number;
  pullRequestId?: number;
  author?: {
    displayName: string;
    imageUrl?: string;
  };
}

export enum NotificationType {
  Mention = 'mention',
  PullRequestComment = 'pr-comment',
  WorkItemUpdate = 'work-item-update',
  WorkItemAssignment = 'work-item-assignment',
  WorkItemStateChange = 'work-item-state-change',
}

export interface NotificationFilter {
  types?: NotificationType[];
  read?: boolean;
  projectId?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
}
