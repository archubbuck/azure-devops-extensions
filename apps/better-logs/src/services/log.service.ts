import * as SDK from 'azure-devops-extension-sdk';
import { LogEntry, LogLevel, LogFilter, LogStats } from '../types/log';

/**
 * LogService - Singleton service for centralized log management
 * Collects, stores, and manages logs from all extensions in the repository
 */
class LogService {
  private static instance: LogService;
  private logs: LogEntry[] = [];
  private readonly STORAGE_KEY = 'better-logs-entries';
  private readonly MAX_LOGS = 10000; // Keep last 10k logs

  private constructor() {
    this.loadLogsFromStorage();
    this.interceptConsoleLogs();
  }

  public static getInstance(): LogService {
    if (!LogService.instance) {
      LogService.instance = new LogService();
    }
    return LogService.instance;
  }

  /**
   * Intercept console logs to capture them centrally
   */
  private interceptConsoleLogs(): void {
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };

    // Override console.log
    console.log = (...args: unknown[]) => {
      this.addLog(LogLevel.Info, 'console', this.formatMessage(args));
      originalConsole.log.apply(console, args);
    };

    // Override console.info
    console.info = (...args: unknown[]) => {
      this.addLog(LogLevel.Info, 'console', this.formatMessage(args));
      originalConsole.info.apply(console, args);
    };

    // Override console.warn
    console.warn = (...args: unknown[]) => {
      this.addLog(LogLevel.Warn, 'console', this.formatMessage(args));
      originalConsole.warn.apply(console, args);
    };

    // Override console.error
    console.error = (...args: unknown[]) => {
      this.addLog(
        LogLevel.Error,
        'console',
        this.formatMessage(args),
        args.length > 1 ? args.slice(1) : undefined
      );
      originalConsole.error.apply(console, args);
    };

    // Override console.debug
    console.debug = (...args: unknown[]) => {
      this.addLog(LogLevel.Debug, 'console', this.formatMessage(args));
      originalConsole.debug.apply(console, args);
    };
  }

  private formatMessage(args: unknown[]): string {
    return args
      .map((arg) => {
        if (typeof arg === 'string') return arg;
        if (arg instanceof Error) return arg.message;
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      })
      .join(' ');
  }

  /**
   * Add a log entry
   */
  public addLog(
    level: LogLevel,
    source: string,
    message: string,
    data?: unknown,
    stackTrace?: string
  ): void {
    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      level,
      source,
      message,
      data,
      stackTrace,
    };

    // Try to enrich with Azure DevOps context
    try {
      const extensionContext = SDK.getExtensionContext();
      entry.extensionId = extensionContext.id;
      entry.extensionName = extensionContext.name;
    } catch {
      // SDK not available yet
    }

    try {
      const user = SDK.getUser();
      entry.userId = user.id;
      entry.userName = user.displayName;
    } catch {
      // User info not available
    }

    try {
      entry.url = window.location.href;
    } catch {
      // URL not available
    }

    this.logs.unshift(entry); // Add to beginning for newest first

    // Limit log size
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(0, this.MAX_LOGS);
    }

    this.saveLogsToStorage();
  }

  /**
   * Get all logs with optional filtering
   */
  public getLogs(filter?: LogFilter): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (!filter) {
      return filteredLogs;
    }

    // Filter by level
    if (filter.levels && filter.levels.length > 0) {
      filteredLogs = filteredLogs.filter((log) =>
        filter.levels?.includes(log.level)
      );
    }

    // Filter by source
    if (filter.sources && filter.sources.length > 0) {
      filteredLogs = filteredLogs.filter((log) =>
        filter.sources?.includes(log.source)
      );
    }

    // Filter by extension
    if (filter.extensionIds && filter.extensionIds.length > 0) {
      filteredLogs = filteredLogs.filter(
        (log) => log.extensionId && filter.extensionIds?.includes(log.extensionId)
      );
    }

    // Filter by date range
    if (filter.startDate) {
      filteredLogs = filteredLogs.filter(
        (log) => log.timestamp >= (filter.startDate as Date)
      );
    }

    if (filter.endDate) {
      filteredLogs = filteredLogs.filter(
        (log) => log.timestamp <= (filter.endDate as Date)
      );
    }

    // Filter by search text
    if (filter.searchText) {
      const searchLower = filter.searchText.toLowerCase();
      filteredLogs = filteredLogs.filter(
        (log) =>
          log.message.toLowerCase().includes(searchLower) ||
          log.source.toLowerCase().includes(searchLower) ||
          (log.extensionName &&
            log.extensionName.toLowerCase().includes(searchLower))
      );
    }

    return filteredLogs;
  }

  /**
   * Get log statistics
   */
  public getStats(filter?: LogFilter): LogStats {
    const logs = this.getLogs(filter);

    const byLevel: Record<LogLevel, number> = {
      [LogLevel.Debug]: 0,
      [LogLevel.Info]: 0,
      [LogLevel.Warn]: 0,
      [LogLevel.Error]: 0,
    };

    const bySource: Record<string, number> = {};
    const byExtension: Record<string, number> = {};

    logs.forEach((log) => {
      byLevel[log.level]++;

      if (!bySource[log.source]) {
        bySource[log.source] = 0;
      }
      bySource[log.source]++;

      if (log.extensionId) {
        if (!byExtension[log.extensionId]) {
          byExtension[log.extensionId] = 0;
        }
        byExtension[log.extensionId]++;
      }
    });

    return {
      total: logs.length,
      byLevel,
      bySource,
      byExtension,
    };
  }

  /**
   * Clear all logs
   */
  public clearLogs(): void {
    this.logs = [];
    this.saveLogsToStorage();
  }

  /**
   * Export logs as JSON
   */
  public exportLogs(filter?: LogFilter): string {
    const logs = this.getLogs(filter);
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Load logs from localStorage
   */
  private loadLogsFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        this.logs = parsed.map((log: LogEntry) => ({
          ...log,
          timestamp: new Date(log.timestamp),
        }));
      }
    } catch (error) {
      console.error('Failed to load logs from storage:', error);
    }
  }

  /**
   * Save logs to localStorage
   */
  private saveLogsToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.logs));
    } catch (error) {
      console.error('Failed to save logs to storage:', error);
    }
  }

  /**
   * Generate a unique ID for log entries
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default LogService;
