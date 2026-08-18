import { useState, useEffect } from 'react';
import { historyApi, type HistoryRecord } from '../services/api';
import { formatDuration, formatPercentage, formatDateDisplay, getTodayStr, addDays } from '../services/formatters';

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [firstDataDate, setFirstDataDate] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);
  const [viewMode, setViewMode] = useState<'weekly' | 'today'>('weekly');

  // Load data range on mount
  useEffect(() => {
    loadRange();
  }, []);

  const loadRange = async () => {
    try {
      const range = await historyApi.getRange();
      setHasData(range.hasData);
      setFirstDataDate(range.firstDataDate);

      if (range.hasData) {
        const today = getTodayStr();
        const from = addDays(today, -6);
        setFromDate(from);
        setToDate(today);
        await loadHistory(from, today);
      } else {
        setLoading(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load data range');
      setLoading(false);
    }
  };

  const loadHistory = async (from: string, to: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await historyApi.getHistory(from, to);
      setHistory(data.history);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const offset = direction === 'prev' ? -7 : 7;
    const newFrom = addDays(fromDate, offset);
    const newTo = addDays(toDate, offset);

    const today = getTodayStr();
    if (newTo > today) return;
    if (firstDataDate && newTo < firstDataDate) return;

    setFromDate(newFrom);
    setToDate(newTo);
    loadHistory(newFrom, newTo);
  };

  const showToday = () => {
    const today = getTodayStr();
    setFromDate(today);
    setToDate(today);
    setViewMode('today');
    loadHistory(today, today);
  };

  const showWeekly = () => {
    const today = getTodayStr();
    const from = addDays(today, -6);
    setFromDate(from);
    setToDate(today);
    setViewMode('weekly');
    loadHistory(from, today);
  };

  const canGoPrev = () => {
    if (!firstDataDate) return false;
    const newTo = addDays(toDate, -7);
    return newTo >= firstDataDate;
  };

  const canGoNext = () => {
    const today = getTodayStr();
    return toDate < today;
  };

  if (!hasData && !loading) {
    return (
      <div className="history-page">
        <div className="page-header">
          <h1>Posture History</h1>
        </div>
        <div className="empty-state">
          <span className="empty-icon">📊</span>
          <h2>No posture history yet</h2>
          <p>Start your first tracking session to begin building your history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-page">
      <div className="page-header">
        <h1>Posture History</h1>
      </div>

      {/* View Mode Toggle */}
      <div className="view-toggle">
        <button
          className={`toggle-btn ${viewMode === 'today' ? 'active' : ''}`}
          onClick={showToday}
        >
          Current Day
        </button>
        <button
          className={`toggle-btn ${viewMode === 'weekly' ? 'active' : ''}`}
          onClick={showWeekly}
        >
          Weekly (7 Days)
        </button>
      </div>

      {/* Navigation */}
      {viewMode === 'weekly' && (
        <div className="history-nav">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigateWeek('prev')}
            disabled={!canGoPrev()}
          >
            ← Previous Week
          </button>
          <div className="date-range">
            <span>{formatDateDisplay(fromDate)}</span>
            <span className="range-separator">→</span>
            <span>{formatDateDisplay(toDate)}</span>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigateWeek('next')}
            disabled={!canGoNext()}
          >
            Next Week →
          </button>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-state"><div className="spinner" /><p>Loading history...</p></div>
      ) : (
        <div className="history-table-wrapper">
          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Monitoring Duration</th>
                <th>Posture Types</th>
                <th>Bad Posture Duration</th>
                <th>Bad Posture %</th>
                <th>Good Posture %</th>
              </tr>
            </thead>
            <tbody>
              {history.map((record) => (
                <tr key={record.localDate} className={record.hasData === false && record.monitoringDurationSeconds === 0 ? 'no-data-row' : ''}>
                  <td>{formatDateDisplay(record.localDate)}</td>
                  {record.hasData === false && record.monitoringDurationSeconds === 0 ? (
                    <td colSpan={5} className="no-data-cell">No monitoring data</td>
                  ) : (
                    <>
                      <td className="mono">{formatDuration(record.monitoringDurationSeconds)}</td>
                      <td>
                        {record.postureTypes.length > 0 ? (
                          <div className="posture-types-cell">
                            {record.postureTypes.map((t) => (
                              <span key={t} className="posture-tag small">{t}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="mono">{formatDuration(record.badDurationSeconds)}</td>
                      <td className={record.badPosturePercentage > 50 ? 'danger' : ''}>
                        {formatPercentage(record.badPosturePercentage)}
                      </td>
                      <td className="success">{formatPercentage(record.goodPosturePercentage)}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
