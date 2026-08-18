import { useState, useEffect, useCallback } from 'react';
import { Calendar } from 'lucide-react';
import { reportApi, historyApi, type WeeklyReport } from '../services/api';
import { formatDuration, formatPercentage, formatDateDisplay, getTodayStr, addDays } from '../services/formatters';

export default function ReportPage() {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const today = getTodayStr();
  const maxStartDate = addDays(today, -7);
  const [startDate, setStartDate] = useState(maxStartDate);
  const [hasData, setHasData] = useState(false);
  const [eligible, setEligible] = useState(true);

  const loadReport = useCallback(async (targetStartDate: string) => {
    setLoading(true);
    setError('');
    try {
      // Load range to check eligibility
      const range = await historyApi.getRange();
      setHasData(range.hasData);

      if (range.hasData && range.reportEligibleDate) {
        const targetEndDate = addDays(targetStartDate, 6);
        if (targetEndDate < range.reportEligibleDate) {
          setEligible(false);
          setReport(null);
        } else {
          setEligible(true);
          const data = await reportApi.generateWeekly(targetEndDate);
          setReport(data.report);
        }
      } else {
        setEligible(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport(startDate);
  }, [startDate, loadReport]);

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
    const input = document.getElementById('hidden-date-input-report') as HTMLInputElement;
    if (input && typeof input.showPicker === 'function') {
      input.showPicker();
    }
  };

  if (!hasData && !loading) {
    return (
      <div className="report-page">
        <div className="page-header"><h1>Weekly Report</h1></div>
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <h2>No data available</h2>
          <p>Start tracking your posture to generate reports.</p>
        </div>
      </div>
    );
  }

  const startDateDisplay = formatDateDisplay(startDate);
  const endDateDisplay = formatDateDisplay(addDays(startDate, 6));

  return (
    <div className="report-page">
      <div className="page-header">
        <h1>Weekly Report</h1>
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
               id="hidden-date-input-report"
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
        <div className="loading-state"><div className="spinner" /><p>Generating report...</p></div>
      ) : !eligible ? (
        <div className="empty-state">
          <span className="empty-icon">⏳</span>
          <h2>Not Yet Eligible</h2>
          <p>Not sufficient data to generate a weekly report for this date range. A weekly report becomes available after seven days of posture history.</p>
        </div>
      ) : report ? (
        <div className="report-card-container">
          <div className="report-card professional-report">
            <div className="report-header">
              <h2>Posture Report</h2>
              <div className="report-dates">
                <div>From: <strong>{formatDateDisplay(report.fromDate)}</strong></div>
                <div>To: <strong>{formatDateDisplay(report.toDate)}</strong></div>
              </div>
            </div>

            <div className="report-body">
              <div className="report-stat-row">
                <span className="stat-label">Total Monitoring Duration</span>
                <span className="stat-value">{formatDuration(report.totalMonitoringDurationSeconds)}</span>
              </div>
              <div className="report-stat-row">
                <span className="stat-label">Total BAD Posture Duration</span>
                <span className="stat-value">{formatDuration(report.totalBadDurationSeconds)}</span>
              </div>
              <div className="report-stat-row">
                <span className="stat-label">BAD Posture %</span>
                <span className="stat-value">{formatPercentage(report.badPosturePercentage)}</span>
              </div>
              <div className="report-stat-row">
                <span className="stat-label">GOOD Posture %</span>
                <span className="stat-value">{formatPercentage(report.goodPosturePercentage)}</span>
              </div>
              <div className="report-stat-row">
                <span className="stat-label">Most Frequent Bad Posture</span>
                <span className="stat-value">
                  {report.mostFrequentBadPosture ? (
                    report.mostFrequentBadPosture
                  ) : (
                    <span className="text-muted">None detected</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
