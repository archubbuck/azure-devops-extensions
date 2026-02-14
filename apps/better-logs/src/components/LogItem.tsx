import { LogEntry, LogLevel } from '../types/log';
import './LogItem.css';

interface LogItemProps {
  log: LogEntry;
  onExpand?: (log: LogEntry) => void;
}

export function LogItem({ log, onExpand }: LogItemProps) {
  const getLevelColor = (level: LogLevel): string => {
    switch (level) {
      case LogLevel.Debug:
        return '#6c757d'; // Gray
      case LogLevel.Info:
        return '#0078d4'; // Azure blue
      case LogLevel.Warn:
        return '#ffc107'; // Yellow/amber
      case LogLevel.Error:
        return '#d13438'; // Red
      default:
        return '#6c757d';
    }
  };

  const getLevelIcon = (level: LogLevel): string => {
    switch (level) {
      case LogLevel.Debug:
        return '🐛';
      case LogLevel.Info:
        return 'ℹ️';
      case LogLevel.Warn:
        return '⚠️';
      case LogLevel.Error:
        return '❌';
      default:
        return '📝';
    }
  };

  const formatTimestamp = (date: Date): string => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  return (
    <div
      className="log-item"
      style={{ borderLeftColor: getLevelColor(log.level) }}
      onClick={() => onExpand && onExpand(log)}
    >
      <div className="log-item-header">
        <span className="log-level-icon">{getLevelIcon(log.level)}</span>
        <span className="log-level" style={{ color: getLevelColor(log.level) }}>
          {log.level.toUpperCase()}
        </span>
        <span className="log-timestamp">{formatTimestamp(log.timestamp)}</span>
        <span className="log-source">{log.source}</span>
        {log.extensionName && (
          <span className="log-extension">{log.extensionName}</span>
        )}
      </div>
      <div className="log-message">{log.message}</div>
      {log.data && (
        <details className="log-data">
          <summary>View Data</summary>
          <pre>{JSON.stringify(log.data, null, 2)}</pre>
        </details>
      )}
      {log.stackTrace && (
        <details className="log-stacktrace">
          <summary>Stack Trace</summary>
          <pre>{log.stackTrace}</pre>
        </details>
      )}
    </div>
  );
}

export default LogItem;
