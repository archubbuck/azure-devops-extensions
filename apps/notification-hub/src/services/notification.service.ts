import * as SDK from 'azure-devops-extension-sdk';
import { 
  getClient, 
  IProjectPageService 
} from 'azure-devops-extension-api';
import { 
  WorkItemTrackingRestClient, 
  WorkItemExpand 
} from 'azure-devops-extension-api/WorkItemTracking';
import { 
  GitRestClient,
  PullRequestStatus
} from 'azure-devops-extension-api/Git';
import { Notification, NotificationType } from '../types/notification';

export class NotificationService {
  private static instance: NotificationService;
  private notifications: Notification[] = [];

  private constructor() {
    // Load saved notification state from localStorage
    this.loadFromLocalStorage();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public async fetchNotifications(): Promise<Notification[]> {
    try {
      const projectService = await SDK.getService<IProjectPageService>('ms.vss-tfs-web.tfs-page-data-service');
      const project = await projectService.getProject();
      
      if (!project) {
        return [];
      }

      const [mentions, prComments, workItemUpdates] = await Promise.all([
        this.fetchMentions(project.id, project.name),
        this.fetchPRComments(project.id, project.name),
        this.fetchWorkItemUpdates(project.id, project.name),
      ]);

      // Preserve existing read/unread state by id
      const existingReadState = new Map(this.notifications.map(n => [n.id, n.read]));

      // Efficiently merge notifications
      const allNotifications = mentions.concat(prComments, workItemUpdates);
      const mergedNotifications = new Array(allNotifications.length);
      
      for (let i = 0; i < allNotifications.length; i++) {
        const notification = allNotifications[i];
        const existingRead = existingReadState.get(notification.id);
        mergedNotifications[i] = existingRead !== undefined
          ? { ...notification, read: existingRead }
          : notification;
      }

      this.notifications = mergedNotifications.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      );

      return this.notifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  private async fetchMentions(projectId: string, projectName: string): Promise<Notification[]> {
    try {
      const witClient = getClient(WorkItemTrackingRestClient);
      const currentUser = SDK.getUser();
      
      // Sanitize display name for WIQL: escape quotes and remove potentially problematic characters
      const displayName = (currentUser.displayName || '').trim();
      if (!displayName) {
        return [];
      }
      
      const mentionToken = `@${displayName}`;
      // Escape single quotes for WIQL and remove square brackets which are WIQL field delimiters
      const escapedMentionToken = mentionToken.replace(/'/g, "''").replace(/[[\]]/g, '');
      
      // Query for work items where the user is mentioned
      const wiql = {
        query: `SELECT [System.Id] FROM WorkItems WHERE [System.History] CONTAINS '${escapedMentionToken}' OR [System.Description] CONTAINS '${escapedMentionToken}' ORDER BY [System.ChangedDate] DESC`
      };
      
      const queryResult = await witClient.queryByWiql(wiql, { project: projectId });
      
      if (!queryResult.workItems || queryResult.workItems.length === 0) {
        return [];
      }

      const workItemIds = queryResult.workItems.slice(0, 20).map(wi => wi.id as number);
      const workItems = await witClient.getWorkItems(workItemIds, undefined, undefined, WorkItemExpand.All);

      return workItems.map(wi => ({
        id: `mention-${wi.id}`,
        type: NotificationType.Mention,
        title: `@${wi.fields?.['System.AssignedTo']?.displayName || 'Someone'} mentioned you`,
        description: `${wi.fields?.['System.WorkItemType']} #${wi.id}: ${wi.fields?.['System.Title']}`,
        timestamp: new Date(wi.fields?.['System.ChangedDate']),
        read: false,
        url: wi._links?.html?.href,
        projectId,
        projectName,
        workItemId: wi.id,
        author: {
          displayName: wi.fields?.['System.ChangedBy']?.displayName,
          imageUrl: wi.fields?.['System.ChangedBy']?.imageUrl,
        },
      }));
    } catch (error) {
      console.error('Error fetching mentions:', error);
      return [];
    }
  }

  private async fetchPRComments(projectId: string, projectName: string): Promise<Notification[]> {
    try {
      const gitClient = getClient(GitRestClient);
      const currentUser = SDK.getUser();
      
      // Get repositories in the project
      const repos = await gitClient.getRepositories(projectId);
      const allComments: Notification[] = [];

      // Get pull requests for each repository (limit to recent)
      for (const repo of repos.slice(0, 5)) {
        try {
          const pullRequests = await gitClient.getPullRequests(
            repo.id as string,
            { status: PullRequestStatus.Active },
            projectId
          );

          for (const pr of pullRequests.slice(0, 10)) {
            try {
              const threads = await gitClient.getThreads(
                repo.id as string,
                pr.pullRequestId as number,
                projectId
              );

              const relevantThreads = threads.filter(thread => 
                thread.comments?.some(comment => 
                  comment.content?.includes(`@${currentUser.displayName}`)
                )
              );

              for (const thread of relevantThreads) {
                const lastComment = thread.comments?.[thread.comments.length - 1];
                if (lastComment && lastComment.publishedDate) {
                  allComments.push({
                    id: `pr-comment-${pr.pullRequestId}-${thread.id}`,
                    type: NotificationType.PullRequestComment,
                    title: `New comment on PR #${pr.pullRequestId}`,
                    description: pr.title || 'Pull Request',
                    timestamp: new Date(lastComment.publishedDate),
                    read: false,
                    url: `${pr.repository?.webUrl}/pullrequest/${pr.pullRequestId}`,
                    projectId,
                    projectName,
                    repositoryId: repo.id,
                    repositoryName: repo.name,
                    pullRequestId: pr.pullRequestId,
                    author: {
                      displayName: lastComment.author?.displayName || 'Unknown',
                      imageUrl: lastComment.author?.imageUrl,
                    },
                  });
                }
              }
            } catch (error) {
              console.error(`Error fetching PR threads for PR ${pr.pullRequestId}:`, error);
            }
          }
        } catch (error) {
          console.error(`Error fetching PRs for repo ${repo.name}:`, error);
        }
      }

      return allComments;
    } catch (error) {
      console.error('Error fetching PR comments:', error);
      return [];
    }
  }

  private async fetchWorkItemUpdates(projectId: string, projectName: string): Promise<Notification[]> {
    try {
      const witClient = getClient(WorkItemTrackingRestClient);
      const currentUser = SDK.getUser();
      
      // Query for work items assigned to the user that have been recently updated
      const wiql = {
        query: `SELECT [System.Id] FROM WorkItems WHERE [System.AssignedTo] = @Me AND [System.ChangedDate] > @Today-7 ORDER BY [System.ChangedDate] DESC`
      };
      
      const queryResult = await witClient.queryByWiql(wiql, { project: projectId });
      
      if (!queryResult.workItems || queryResult.workItems.length === 0) {
        return [];
      }

      const workItemIds = queryResult.workItems.slice(0, 20).map(wi => wi.id as number);
      const workItems = await witClient.getWorkItems(workItemIds, undefined, undefined, WorkItemExpand.All);

      const notifications: Notification[] = [];

      for (const wi of workItems) {
        const changedBy = wi.fields?.['System.ChangedBy']?.displayName;
        
        // Skip if the current user made the change
        if (changedBy === currentUser.displayName) {
          continue;
        }

        // Check for state changes
        const state = wi.fields?.['System.State'];
        notifications.push({
          id: `work-item-${wi.id}-${new Date(wi.fields?.['System.ChangedDate']).getTime()}`,
          type: NotificationType.WorkItemUpdate,
          title: `Work item updated`,
          description: `${wi.fields?.['System.WorkItemType']} #${wi.id}: ${wi.fields?.['System.Title']} - ${state}`,
          timestamp: new Date(wi.fields?.['System.ChangedDate']),
          read: false,
          url: wi._links?.html?.href,
          projectId,
          projectName,
          workItemId: wi.id,
          author: {
            displayName: changedBy,
            imageUrl: wi.fields?.['System.ChangedBy']?.imageUrl,
          },
        });
      }

      return notifications;
    } catch (error) {
      console.error('Error fetching work item updates:', error);
      return [];
    }
  }

  public getNotifications(): Notification[] {
    return this.notifications;
  }

  public markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.saveToLocalStorage();
    }
  }

  public markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
    this.saveToLocalStorage();
  }

  public getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  private saveToLocalStorage(): void {
    try {
      localStorage.setItem('notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem('notifications');
      if (stored) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.notifications = JSON.parse(stored).map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        }));
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  }
}
