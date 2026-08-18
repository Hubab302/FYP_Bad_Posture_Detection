import { useState, useEffect } from 'react';
import { reportApi, historyApi, type WeeklyReport } from '../services/api';
import { formatDuration, formatPercentage, formatDateDisplay, getTodayStr, addDays } from '../services/formatters';

export default function ReportPage() {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [eligible, setEligible] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [firstDataDate, setFirstDataDate] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkEligibility();
  }, []);

  const checkEligibility = async () => {
    try {
      const range = await historyApi.getRange();
      setHasData(range.hasData);
      setFirstDataDate(range.firstDataDate);

      if (range.hasData && range.reportEligibleDate) {
        const today = getTodayStr();
        setEligible(today >= range.reportEligibleDate);

        if (today >= range.reportEligibleDate) {
          const from = addDays(today, -6);
          setFromDate(from);
          setToDate(today);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to check eligibility');
    } finally {
      setChecking(false);
    }
  };

  const generateReport = async () => {
    setError('');
    setGenerating(true);
    try {
      const data = await reportApi.generateWeekly(fromDate, toDate);
      setReport((data as { report: WeeklyReport }).report);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setGenerating(false);
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
    setReport(null);
  };

  const canGoPrev = () => {
    if (!firstDataDate) return false;
    return addDays(toDate, -7) >= firstDataDate;
  };

  const canGoNext = () => {
    return toDate < getTodayStr();
  };

  if (checking) {
    return (
      <div className="report-page">
        <div className="page-header"><h1>Weekly Report</h1></div>
        <div className="loading-state"><div className="spinner" /><p>Checking eligibility...</p></div>
      </div>
    );
  }

  if (!hasData) {
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

  if (!eligible) {
    return (
      <div className="report-page">
        <div className="page-header"><h1>Weekly Report</h1></div>
        <div className="empty-state">
          <span className="empty-icon">⏳</span>
          <h2>Not Yet Eligible</h2>
          <p>Not sufficient data to generate a weekly report. A weekly report becomes available after seven days of posture history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="report-page">
      <div className="page-header">
        <h1>Weekly Report</h1>
      </div>

      {/* Week Navigation */}
      <div className="history-nav">
        <button className="btn btn-secondary btn-sm" onClick={() => navigateWeek('prev')} disabled={!canGoPrev()}>
          ← Previous Week
        </button>
        <div className="date-range">
          <span>{formatDateDisplay(fromDate)}</span>
          <span className="range-separator">→</span>
          <span>{formatDateDisplay(toDate)}</span>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => navigateWeek('next')} disabled={!canGoNext()}>
          Next Week →
        </button>
      </div>

      {!report && (
        <div className="generate-section">
          <button className="btn btn-primary" onClick={generateReport} disabled={generating}>
            {generating ? 'Generating Report...' : 'Generate Report'}
          </button>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {report && (
        <div className="report-card">
          <div className="report-header">
            <h2>Posture Report</h2>
            <div className="report-dates">
              <div>From: <strong>{formatDateDisplay(report.fromDate)}</strong></div>
              <div>To: <strong>{formatDateDisplay(report.toDate)}</strong></div>
            </div>
          </div>

          <div className="report-body">
            <div className="report-stat">
              <label>Total Monitoring Duration</label>
              <div className="stat-value mono">{formatDuration(report.totalMonitoringDurationSeconds)}</div>
            </div>

            <div className="report-stat">
              <label>Total Bad Posture Duration</label>
              <div className="stat-value mono danger">{formatDuration(report.totalBadDurationSeconds)}</div>
            </div>

            <div className="report-stat">
              <label>Bad Posture Percentage</label>
              <div className="stat-value danger">{formatPercentage(report.badPosturePercentage)}</div>
            </div>

            <div className="report-stat">
              <label>Good Posture Percentage</label>
              <div className="stat-value success">{formatPercentage(report.goodPosturePercentage)}</div>
            </div>

            <div className="report-stat">
              <label>Most Frequent Bad Posture</label>
              <div className="stat-value">
                {report.mostFrequentBadPosture ? (
                  <span className="posture-tag bad">{report.mostFrequentBadPosture}</span>
                ) : (
                  <span className="text-muted">None detected</span>
                )}
              </div>
            </div>
          </div>

          <div className="report-footer">
            <small>Generated at: {new Date(report.generatedAt).toLocaleString()}</small>
          </div>
        </div>
      )}
    </div>
  );
}
