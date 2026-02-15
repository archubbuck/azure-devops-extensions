import { describe, it, expect, vi, beforeEach } from 'vitest';
import LogService from './log.service';
import { LogLevel } from './types';

// Mock the Azure DevOps SDK
vi.mock('azure-devops-extension-sdk', () => ({
  getExtensionContext: vi.fn().mockReturnValue({
    id: 'test-publisher.test-extension',
    publisherId: 'test-publisher',
    extensionId: 'test-extension',
    version: '1.0.0',
  }),
  getUser: vi.fn().mockReturnValue({
    id: 'test-user-id',
    displayName: 'Test User',
  }),
}));

describe('LogService', () => {
  let logService: LogService;

  beforeEach(() => {
    // Get instance and clear
    logService = LogService.getInstance();
    logService.clearLogs();
    // Clear localStorage to ensure clean state
    localStorage.clear();
  });

  it('should be a singleton', () => {
    const instance1 = LogService.getInstance();
    const instance2 = LogService.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should add a log entry and retrieve it', () => {
    const initialCount = logService.getLogs().length;
    logService.addLog(LogLevel.Info, 'test-source', 'Test message');
    const logs = logService.getLogs();
    
    expect(logs.length).toBeGreaterThan(initialCount);
    
    // Find our test log
    const testLog = logs.find(log => 
      log.source === 'test-source' && log.message === 'Test message'
    );
    expect(testLog).toBeDefined();
    expect(testLog?.level).toBe(LogLevel.Info);
  });

  it('should filter logs by level', () => {
    logService.clearLogs();
    logService.addLog(LogLevel.Info, 'test', 'Info message');
    logService.addLog(LogLevel.Error, 'test', 'Error message');
    logService.addLog(LogLevel.Warn, 'test', 'Warning message');

    const errorLogs = logService.getLogs({ levels: [LogLevel.Error] });
    expect(errorLogs.length).toBeGreaterThan(0);
    expect(errorLogs.every(log => log.level === LogLevel.Error)).toBe(true);
  });

  it('should filter logs by source', () => {
    logService.clearLogs();
    logService.addLog(LogLevel.Info, 'source-1', 'Message 1');
    logService.addLog(LogLevel.Info, 'source-2', 'Message 2');

    const source1Logs = logService.getLogs({ sources: ['source-1'] });
    expect(source1Logs.length).toBeGreaterThan(0);
    expect(source1Logs.every(log => log.source === 'source-1')).toBe(true);
  });

  it('should filter logs by search text', () => {
    logService.clearLogs();
    logService.addLog(LogLevel.Info, 'test', 'Hello World');
    logService.addLog(LogLevel.Info, 'test', 'Goodbye World');

    const helloLogs = logService.getLogs({ searchText: 'Hello' });
    expect(helloLogs.length).toBeGreaterThan(0);
    const foundHello = helloLogs.some(log => log.message.includes('Hello'));
    expect(foundHello).toBe(true);
  });

  it('should manage log lifecycle correctly', () => {
    // Test that we can add and retrieve logs
    const uniqueId = Date.now();
    const testSource = `test-source-${uniqueId}`;
    
    logService.addLog(LogLevel.Info, testSource, 'Test message 1');
    logService.addLog(LogLevel.Warn, testSource, 'Test message 2');
    
    // Verify logs were added
    const logs = logService.getLogs({ sources: [testSource] });
    expect(logs.length).toBe(2);
    expect(logs[0].source).toBe(testSource);
    expect(logs[1].source).toBe(testSource);
  });

  it('should export logs as JSON', () => {
    logService.clearLogs();
    logService.addLog(LogLevel.Info, 'test', 'Test message');
    const exported = logService.exportLogs();
    
    expect(exported).toBeTruthy();
    const parsed = JSON.parse(exported);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
  });

  it('should generate statistics', () => {
    logService.clearLogs();
    logService.addLog(LogLevel.Info, 'source-1', 'Message 1');
    logService.addLog(LogLevel.Error, 'source-2', 'Message 2');
    logService.addLog(LogLevel.Info, 'source-1', 'Message 3');

    const stats = logService.getStats();
    expect(stats.total).toBeGreaterThanOrEqual(3);
    expect(stats.byLevel[LogLevel.Info]).toBeGreaterThanOrEqual(2);
    expect(stats.byLevel[LogLevel.Error]).toBeGreaterThanOrEqual(1);
    expect(stats.bySource['source-1']).toBeGreaterThanOrEqual(2);
    expect(stats.bySource['source-2']).toBeGreaterThanOrEqual(1);
  });

  it('should enrich log entries with extension context', () => {
    logService.clearLogs();
    logService.addLog(LogLevel.Info, 'test', 'Test message');
    const logs = logService.getLogs();
    
    expect(logs.length).toBeGreaterThan(0);
    // Find the log we just added
    const log = logs.find(l => l.message === 'Test message');
    expect(log).toBeDefined();
    expect(log?.extensionId).toBe('test-publisher.test-extension');
    expect(log?.extensionName).toBe('test-extension');
  });

  it('should enrich log entries with user info', () => {
    logService.clearLogs();
    logService.addLog(LogLevel.Info, 'test', 'Test message with user');
    const logs = logService.getLogs();
    
    expect(logs.length).toBeGreaterThan(0);
    // Find the log we just added
    const log = logs.find(l => l.message === 'Test message with user');
    expect(log).toBeDefined();
    expect(log?.userId).toBe('test-user-id');
    expect(log?.userName).toBe('Test User');
  });
});
