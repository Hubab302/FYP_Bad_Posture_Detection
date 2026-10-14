import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Clock,
  Layers,
  Calendar,
  Camera,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  reportApi,
  historyApi,
  trackingApi,
  type WeeklyReport,
  type HistoryRecord,
  type RecentSession,
} from '../services/api';
import {
  formatDuration,
  formatChartDate,
  getTodayStr,
  addDays,
} from '../services/formatters';

interface TrendDataPoint {
  dateKey: string;
  displayDate: string;
  Good: number;
  Poor: number;
  rawDuration: number;
}

export default function DashboardPage() {
  // Calendar Date State for 7-day rolling window
  // Rule: Current day is strictly excluded. The maximum allowed endDate is yesterday (addDays(today, -1)).
  const today = getTodayStr();
  const maxEndDate = addDays(today, -1);
  const [endDate, setEndDate] = useState<string>(() => {
    const saved = sessionStorage.getItem('app_selected_endDate');
    if (saved && saved <= maxEndDate) {
      return saved;
    }
    return maxEndDate;
  });

  // Save selected date to sessionStorage whenever changed
  useEffect(() => {
    if (endDate) {
      sessionStorage.setItem('app_selected_endDate', endDate);
    }
  }, [endDate]);

  // Computed 7-day start date
  const startDate = addDays(endDate, -6);

  // Core Data States
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [hasAnyData, setHasAnyData] = useState(false);
  const [firstDataDate, setFirstDataDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboardData = useCallback(async (currentEndDate: string) => {
    setLoading(true);
    setError('');

    try {
      // 1. History range check to know earliest data date
      const range = await historyApi.getRange();
      setHasAnyData(range.hasData);
      setFirstDataDate(range.firstDataDate);

      // 2. Recent sessions (to calculate alerts and avg time for the selected period)
      try {
        const recentRes = await trackingApi.getRecent(20);
        setRecentSessions(recentRes.sessions || []);
      } catch (sessErr) {
        console.warn('Failed to fetch recent sessions:', sessErr);
      }

      if (!range.hasData) {
        setReport(null);
        setHistoryRecords([]);
        setLoading(false);
        return;
      }

      // 3. Weekly aggregated report for this 7-day completed window
      try {
        const reportRes = await reportApi.generateWeekly(currentEndDate);
        setReport(reportRes.report);
      } catch (repErr) {
        console.warn('Report generation notice:', repErr);
        setReport(null);
      }

      // 4. Daily history breakdown for the exact 7-day completed window
      try {
        const histRes = await historyApi.getHistory(currentEndDate, 7);
        setHistoryRecords(histRes.history || []);
      } catch (histErr) {
        console.error('Failed to fetch history:', histErr);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData(endDate);
  }, [endDate, loadDashboardData]);

  // Navigate 7-day rolling window by day offset
  const navigateDays = (offset: number) => {
    const newEnd = addDays(endDate, offset);
    if (newEnd > maxEndDate) return; // Prevent future / uncompleted dates
    if (firstDataDate && newEnd < addDays(firstDataDate, 6)) return; // Prevent going before first available data span
    setEndDate(newEnd);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.value;
    if (selected > maxEndDate) {
      setEndDate(maxEndDate);
    } else {
      setEndDate(selected);
    }
  };

  const openDatePicker = () => {
    const input = document.getElementById('hidden-date-input-dashboard') as HTMLInputElement;
    if (input && typeof input.showPicker === 'function') {
      input.showPicker();
    }
  };

  // Sessions in the selected 7-day window
  const sessionsInPeriod = recentSessions.filter((s) => {
    const sDate = s.startedAt ? s.startedAt.split('T')[0] : '';
    return sDate >= startDate && sDate <= endDate;
  });

  // Total alerts in the period
  const totalAlertsCount = sessionsInPeriod.reduce((sum, s) => sum + (s.alertCount || 0), 0);

  // Aggregated durations & percentages
  const totalMonitoringSecs =
    report?.totalMonitoringDurationSeconds ??
    historyRecords.reduce((acc, cur) => acc + (cur.monitoringDurationSeconds || 0), 0);

  const totalGoodSecs =
    report?.totalGoodDurationSeconds ??
    historyRecords.reduce((acc, cur) => acc + (cur.goodDurationSeconds || 0), 0);

  const totalBadSecs =
    report?.totalBadDurationSeconds ??
    historyRecords.reduce((acc, cur) => acc + (cur.badDurationSeconds || 0), 0);

  const rawGoodPct =
    report?.goodPosturePercentage ??
    (totalMonitoringSecs > 0 ? (totalGoodSecs / totalMonitoringSecs) * 100 : 0);

  const rawBadPct =
    report?.badPosturePercentage ??
    (totalMonitoringSecs > 0 ? (totalBadSecs / totalMonitoringSecs) * 100 : 100 - rawGoodPct);

  const goodPosturePercentage = Math.round(rawGoodPct);
  const goodDisplayStr = rawGoodPct.toFixed(1) + '%';
  const badDisplayStr = rawBadPct.toFixed(1) + '%';

  // Chart data: exactly the 7 completed days of the selected window
  const chartData: TrendDataPoint[] = historyRecords.slice(-7).map((r) => {
    const gPct = Math.round(r.goodPosturePercentage || 0);
    const pPct = Math.round(r.badPosturePercentage || 0);
    return {
      dateKey: r.localDate,
      displayDate: formatChartDate(r.localDate),
      Good: gPct,
      Poor: pPct,
      rawDuration: r.monitoringDurationSeconds || 0,
    };
  });

  // Circular gauge SVG calculations with a larger radius (r = 72 on 170x170 viewBox)
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const greenDashoffset = circumference - (goodPosturePercentage / 100) * circumference;

  return (
    <div className="reference-dashboard-wrapper">
      {/* ── Main Dashboard Container Card ── */}
      <div className="reference-card-container">
        {/* ── Top Blue Header Bar ── */}
        <div className="reference-header-bar">
          <h1 className="reference-header-title">Posture Dashboard</h1>

          {/* Working Calendar Navigation for Available Dates */}
          <div className="reference-header-actions">
            <div className="header-date-nav">
              <button
                type="button"
                className="header-nav-btn"
                onClick={() => navigateDays(-1)}
                title="Previous Day"
                disabled={Boolean(firstDataDate && endDate <= addDays(firstDataDate, 6))}
              >
                &larr;
              </button>

              <span className="header-date-text">
                {formatChartDate(startDate)} &ndash; {formatChartDate(endDate)}
              </span>

              <button
                type="button"
                className="header-nav-btn"
                onClick={() => navigateDays(1)}
                title="Next Day"
                disabled={endDate >= maxEndDate}
              >
                &rarr;
              </button>
            </div>

            {/* Clickable Calendar Picker Button */}
            <div className="header-calendar-icon-btn" onClick={openDatePicker} title="Select 7-Day Window End Date">
              <Calendar size={15} />
              <input
                id="hidden-date-input-dashboard"
                type="date"
                value={endDate}
                max={maxEndDate}
                min={firstDataDate ? addDays(firstDataDate, 6) : undefined}
                onChange={handleDateChange}
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
              />
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="reference-card-body">
          {error && <div className="error-message">{error}</div>}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 0', color: '#64748b' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem auto' }} />
              <p>Loading posture analytics...</p>
            </div>
          ) : !hasAnyData ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', background: '#ffffff', borderRadius: 12 }}>
              <Layers size={36} color="#1565c0" style={{ marginBottom: 8 }} />
              <h3 style={{ color: '#1e293b', marginBottom: 6, fontSize: '1rem' }}>No Monitoring Sessions Recorded</h3>
              <p style={{ color: '#64748b', marginBottom: 12, fontSize: '0.85rem' }}>
                Completed tracking sessions will populate this dashboard automatically.
              </p>
              <Link to="/track" className="btn btn-primary btn-sm">
                <Camera size={14} /> Start Tracking Now
              </Link>
            </div>
          ) : (
            <>
              {/* ── Top Row: Posture Summary + 2 Stat Tiles ── */}
              <div className="reference-summary-row">
                {/* Left: Circular Good (Green) & Poor (Red) Posture Gauge */}
                <div className="summary-circular-card">
                  <div className="section-box-title">Posture Summary</div>

                  <div className="circular-gauge-container">
                    <div className="gauge-svg-wrapper">
                      <svg width="170" height="170" viewBox="0 0 170 170">
                        {/* Red track representing Poor Posture */}
                        <circle
                          cx="85"
                          cy="85"
                          r={radius}
                          fill="transparent"
                          stroke="#ef4444"
                          strokeWidth="11"
                        />
                        {/* Green stroke representing Good Posture */}
                        <circle
                          cx="85"
                          cy="85"
                          r={radius}
                          fill="transparent"
                          stroke="#16a34a"
                          strokeWidth="11"
                          strokeDasharray={circumference}
                          strokeDashoffset={greenDashoffset}
                          strokeLinecap="round"
                          transform="rotate(-90 85 85)"
                          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                        />
                      </svg>
                      {/* Formatted with 1-decimal matching Report page (e.g. 77.6% Good, 22.4% Bad) */}
                      <div className="gauge-center-labels">
                        <div className="gauge-good-label">{goodDisplayStr} Good</div>
                        <div className="gauge-poor-label">{badDisplayStr} Bad</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: 2 Stat Tiles (Poor Posture Alerts & Avg Session Time) */}
                <div className="summary-stats-column">
                  {/* Poor Posture Alerts */}
                  <div className="stat-item-row">
                    <div className="stat-icon-box">
                      <Bell size={22} color="#475569" strokeWidth={2.2} />
                    </div>
                    <div className="stat-content">
                      <span className="stat-label-text">Poor Posture Alerts</span>
                      <span className="stat-number-text">{totalAlertsCount}</span>
                    </div>
                  </div>

                  {/* Total Monitoring Time */}
                  <div className="stat-item-row">
                    <div className="stat-icon-box">
                      <Clock size={22} color="#475569" strokeWidth={2.2} />
                    </div>
                    <div className="stat-content">
                      <span className="stat-label-text">Total Monitoring Time</span>
                      <span className="stat-number-text mono">
                        {formatDuration(totalMonitoringSecs)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Bottom Section: Posture Trend Chart (Previous 7 completed days) ── */}
              <div className="trend-chart-card">
                <div className="trend-chart-header">
                  <div className="section-box-title" style={{ margin: 0 }}>
                    Posture Trend
                  </div>

                  {/* Good & Poor Legend */}
                  <div className="trend-legend-pills">
                    <div className="legend-pill-item">
                      <span className="legend-color-dot good" />
                      <span>Good</span>
                    </div>
                    <div className="legend-pill-item">
                      <span className="legend-color-dot poor" />
                      <span>Poor</span>
                    </div>
                  </div>
                </div>

                <div className="trend-chart-body">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 8, right: 12, left: -22, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="goodGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="poorGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>

                      <CartesianGrid stroke="#f1f5f9" vertical={false} strokeDasharray="3 3" />

                      <XAxis
                        dataKey="displayDate"
                        stroke="#94a3b8"
                        fontSize={10.5}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />

                      <YAxis
                        stroke="#94a3b8"
                        fontSize={10.5}
                        tickLine={false}
                        axisLine={false}
                        unit="%"
                        domain={[0, 100]}
                        ticks={[0, 20, 50, 70, 100]}
                      />

                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload as TrendDataPoint;
                            return (
                              <div
                                style={{
                                  background: '#1e293b',
                                  color: '#ffffff',
                                  padding: '6px 10px',
                                  borderRadius: 6,
                                  fontSize: '0.78rem',
                                  boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                                }}
                              >
                                <div style={{ fontWeight: 700, marginBottom: 3, color: '#94a3b8' }}>
                                  {label}
                                </div>
                                <div style={{ color: '#34d399', marginBottom: 2 }}>
                                  Good Posture: <strong>{data.Good}%</strong>
                                </div>
                                <div style={{ color: '#f87171' }}>
                                  Poor Posture: <strong>{data.Poor}%</strong>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />

                      {/* Good Posture Green Curve */}
                      <Area
                        type="monotone"
                        dataKey="Good"
                        stroke="#10b981"
                        strokeWidth={2.2}
                        fillOpacity={1}
                        fill="url(#goodGradient)"
                        dot={{ r: 3, fill: '#10b981', strokeWidth: 1, stroke: '#ffffff' }}
                        activeDot={{ r: 4.5 }}
                      />

                      {/* Poor Posture Red Curve */}
                      <Area
                        type="monotone"
                        dataKey="Poor"
                        stroke="#ef4444"
                        strokeWidth={2.2}
                        fillOpacity={1}
                        fill="url(#poorGradient)"
                        dot={{ r: 3, fill: '#ef4444', strokeWidth: 1, stroke: '#ffffff' }}
                        activeDot={{ r: 4.5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
