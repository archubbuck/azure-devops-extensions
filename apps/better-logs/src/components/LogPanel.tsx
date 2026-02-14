import { useState, useEffect } from 'react';
import LogService from '../services/log.service';
import { LogEntry, LogLevel, LogFilter, LogStats } from '../types/log';
import LogItem from './LogItem';
import './LogPanel.css';

interface LogPanelProps {
  onReady?: () => void;
}

export function LogPanel({ onReady }: LogPanelProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedLevels, setSelectedLevels] = useState<LogLevel[]>([
    LogLevel.Debug,
    LogLevel.Info,
    LogLevel.Warn,
    LogLevel.Error,
  ]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [stats, setStats] = useState<LogStats | null>(null);

  const logService = LogService.getInstance();

  // Load logs
  const loadLogs = () => {
    const currentFilter: LogFilter = {
      levels: selectedLevels,
      searchText: searchText || undefined,
    };
    const filteredLogs = logService.getLogs(currentFilter);
    setLogs(filteredLogs);
    setStats(logService.getStats(currentFilter));
  };

  // Initial load
  useEffect(() => {
    loadLogs();
    if (onReady) {
      onReady();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadLogs();
    }, 2000); // Refresh every 2 seconds

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, selectedLevels, searchText]);

  // Manual refresh on filter change
  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLevels, searchText]);

  const handleToggleLevel = (level: LogLevel) => {
    setSelectedLevels((prev) => {
      if (prev.includes(level)) {
        return prev.filter((l) => l !== level);
      } else {
        return [...prev, level];
      }
    });
  };

  const handleClearLogs = () => {
    if (
      window.confirm(
        'Are you sure you want to clear all logs? This action cannot be undone.'
      )
    ) {
      logService.clearLogs();
      loadLogs();
    }
  };

  const handleExportLogs = () => {
    const currentFilter: LogFilter = {
      levels: selectedLevels,
      searchText: searchText || undefined,
    };
    const json = logService.exportLogs(currentFilter);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLevelColor = (level: LogLevel): string => {
    switch (level) {
      case LogLevel.Debug:
        return '#6c757d';
      case LogLevel.Info:
        return '#0078d4';
      case LogLevel.Warn:
        return '#ffc107';
      case LogLevel.Error:
        return '#d13438';
      default:
        return '#6c757d';
    }
  };

  return (
    <div className="log-panel">
      <div className="log-panel-header">
        <h2>Better Logs</h2>
        <div className="log-stats">
          {stats && (
            <>
              <span className="stat-item">
                Total: <strong>{stats.total}</strong>
              </span>
              <span
                className="stat-item"
                style={{ color: getLevelColor(LogLevel.Error) }}
              >
                Errors: <strong>{stats.byLevel[LogLevel.Error]}</strong>
              </span>
              <span
                className="stat-item"
                style={{ color: getLevelColor(LogLevel.Warn) }}
              >
                Warnings: <strong>{stats.byLevel[LogLevel.Warn]}</strong>
              </span>
            </>
          )}
        </div>
      </div>

      <div className="log-panel-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search logs..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="level-filters">
          {Object.values(LogLevel).map((level) => (
            <label key={level} className="level-filter">
              <input
                type="checkbox"
                checked={selectedLevels.includes(level)}
                onChange={() => handleToggleLevel(level)}
              />
              <span style={{ color: getLevelColor(level) }}>
                {level.toUpperCase()}
              </span>
              {stats && (
                <span className="level-count">({stats.byLevel[level]})</span>
              )}
            </label>
          ))}
        </div>

        <div className="action-buttons">
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <button onClick={loadLogs} className="btn btn-secondary">
            <span role="img" aria-label="Refresh">
              🔄
            </span>{' '}
            Refresh
          </button>
          <button onClick={handleExportLogs} className="btn btn-secondary">
            <span role="img" aria-label="Export">
              📥
            </span>{' '}
            Export
          </button>
          <button onClick={handleClearLogs} className="btn btn-danger">
            <span role="img" aria-label="Delete">
              🗑️
            </span>{' '}
            Clear All
          </button>
        </div>
      </div>

      <div className="log-list">
        {logs.length === 0 ? (
          <div className="empty-state">
            <p>No logs found matching the current filters.</p>
            <p className="empty-state-hint">
              Logs will appear here as extensions generate them.
            </p>
          </div>
        ) : (
          logs.map((log) => <LogItem key={log.id} log={log} />)
        )}
      </div>
    </div>
  );
}

export default LogPanel;
