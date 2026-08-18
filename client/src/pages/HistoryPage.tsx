import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { historyApi, type HistoryRecord } from '../services/api';
import { formatDuration, formatPercentage, formatDateDisplay, getTodayStr, addDays } from '../services/formatters';

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const today = getTodayStr();
  const maxStartDate = addDays(today, -6); // End date cannot exceed today
  const [startDate, setStartDate] = useState(maxStartDate);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    loadRangeAndHistory(startDate);
  }, [startDate]);

  const loadRangeAndHistory = async (targetStartDate: string) => {
    setLoading(true);
    setError('');
    try {
      // Load range just to know if we have ANY data
      const range = await historyApi.getRange();
      setHasData(range.hasData);

      if (range.hasData) {
        const targetEndDate = addDays(targetStartDate, 6);
        const data = await historyApi.getHistory(targetEndDate);
        // Display newest first
        setHistory(data.history.reverse());
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const navigateDays = (offset: number) => {
    const newStart = addDays(startDate, offset);
    if (newStart > maxStartDate) return; // Prevent future dates
    setStartDate(newStart);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.value;
    if (selected > maxStartDate) {
      setStartDate(maxStartDate);
    } else {
      setStartDate(selected);
    }
  };

  const openDatePicker = () => {
    const input = document.getElementById('hidden-date-input') as HTMLInputElement;
    if (input && typeof input.showPicker === 'function') {
      input.showPicker();
    }
  };

  if (!hasData && !loading && history.length === 0) {
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

  const startDateDisplay = formatDateDisplay(startDate);
  const endDateDisplay = formatDateDisplay(addDays(startDate, 6));

  return (
    <div className="history-page">
      <div className="page-header">
        <h1>Posture History</h1>
      </div>

      <div className="rolling-nav-container">
        <div className="history-nav">
          <button
            className="btn btn-secondary btn-sm nav-arrow"
            onClick={() => navigateDays(-1)}
            title="Previous Day"
          >
            ←
          </button>
          <div className="date-range" title="7-Day Rolling Window">
            <span>{startDateDisplay}</span>
            <span className="range-separator"> &ndash; </span>
            <span>{endDateDisplay}</span>
          </div>
          
          <div className="date-picker-icon-wrapper">
             <button 
               className="btn btn-secondary btn-sm nav-arrow calendar-btn" 
               title="Choose start date" 
               onClick={openDatePicker}
             >
               <Calendar size={16} strokeWidth={2} />
             </button>
             <input 
               id="hidden-date-input"
               type="date" 
               value={startDate}
               max={maxStartDate}
               onChange={handleDateChange}
               style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
             />
          </div>

          <button
            className="btn btn-secondary btn-sm nav-arrow"
            onClick={() => navigateDays(1)}
            disabled={startDate >= maxStartDate}
            title="Next Day"
          >
            →
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-state"><div className="spinner" /><p>Loading history...</p></div>
      ) : (
        <div className="history-table-wrapper">
          <table className="history-table compact-table">
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
                        {record.postureTypes && record.postureTypes.length > 0 ? (
                          <div className="posture-types-text">
                            {record.postureTypes.join(', ')}
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
