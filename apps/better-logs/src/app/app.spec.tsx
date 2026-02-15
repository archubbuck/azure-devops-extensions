import { render } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

import App from './app';

// Mock the Azure DevOps SDK
vi.mock('azure-devops-extension-sdk', () => ({
  init: vi.fn().mockResolvedValue(undefined),
  notifyLoadSucceeded: vi.fn(),
  getExtensionContext: vi.fn().mockReturnValue({
    id: 'test-extension',
    publisherId: 'test-publisher',
    extensionId: 'test-extension-id',
    version: '1.0.0',
  }),
}));

// Mock LogService
vi.mock('../services/log.service', () => {
  const mockInstance = {
    getLogs: vi.fn().mockReturnValue([]),
    getStats: vi.fn().mockReturnValue({
      total: 0,
      byLevel: { debug: 0, info: 0, warn: 0, error: 0 },
      bySource: {},
      byExtension: {},
    }),
    addLog: vi.fn(),
    clearLogs: vi.fn(),
    exportLogs: vi.fn().mockReturnValue('[]'),
  };

  return {
    // Mock the default-exported class with a static getInstance()
    default: {
      getInstance: vi.fn().mockReturnValue(mockInstance),
    },
  };
});

describe('App', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<App />);
    expect(baseElement).toBeTruthy();
  });
});
