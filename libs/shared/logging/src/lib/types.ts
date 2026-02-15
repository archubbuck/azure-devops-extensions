export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  source: string;
  message: string;
  data?: unknown;
  stackTrace?: string;
  extensionId?: string;
  extensionName?: string;
  userId?: string;
  userName?: string;
  url?: string;
}

export enum LogLevel {
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}

export interface LogFilter {
  levels?: LogLevel[];
  sources?: string[];
  extensionIds?: string[];
  startDate?: Date;
  endDate?: Date;
  searchText?: string;
}

export interface LogStats {
  total: number;
  byLevel: Record<LogLevel, number>;
  bySource: Record<string, number>;
  byExtension: Record<string, number>;
}
