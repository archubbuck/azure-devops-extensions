import { vi } from 'vitest';

// Mock Azure DevOps SDK
vi.mock('azure-devops-extension-sdk', () => ({
  init: vi.fn(() => Promise.resolve()),
  notifyLoadSucceeded: vi.fn(),
  getUser: vi.fn(() => ({ displayName: 'Test User', id: 'test-user-id' })),
  getService: vi.fn(() => Promise.resolve({
    getProject: vi.fn(() => Promise.resolve({ id: 'test-project', name: 'Test Project' }))
  }))
}));

// Mock azure-devops-extension-api
vi.mock('azure-devops-extension-api', () => ({
  getClient: vi.fn(() => ({
    queryByWiql: vi.fn(() => Promise.resolve({ workItems: [] })),
    getRepositories: vi.fn(() => Promise.resolve([])),
    getWorkItems: vi.fn(() => Promise.resolve([])),
    getPullRequests: vi.fn(() => Promise.resolve([])),
    getThreads: vi.fn(() => Promise.resolve([]))
  }))
}));

vi.mock('azure-devops-extension-api/WorkItemTracking', () => ({
  WorkItemTrackingRestClient: vi.fn(),
  WorkItemExpand: {
    All: 4
  }
}));

vi.mock('azure-devops-extension-api/Git', () => ({
  GitRestClient: vi.fn(),
  PullRequestStatus: {
    Active: 1,
    Completed: 3,
    Abandoned: 2,
    All: 4,
    NotSet: 0
  }
}));
