/**
 * Date Utilities & Rolling Window Tests — Pure unit tests (no MongoDB needed).
 */
const {
  getTodayLocal,
  toLocalDateStr,
  isValidDateStr,
  daysBetween,
  addDaysToDateStr,
  getRollingSevenDayWindow,
  getLocalDatesInRange,
  clampToToday,
  parseLocalDate,
} = require('../utils/dateUtils');

const { calculateStats } = require('../services/aggregationService');

describe('dateUtils', () => {
  describe('getTodayLocal', () => {
    test('returns YYYY-MM-DD format for local date', () => {
      const today = getTodayLocal();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const now = new Date();
      const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      expect(today).toBe(expected);
    });
  });

  describe('toLocalDateStr', () => {
    test('uses local timezone, not UTC', () => {
      const d = new Date(2026, 7, 18, 23, 30, 0); // Aug 18, 11:30 PM local
      expect(toLocalDateStr(d)).toBe('2026-08-18');
    });

    test('handles midnight correctly', () => {
      const d = new Date(2026, 7, 18, 0, 0, 0);
      expect(toLocalDateStr(d)).toBe('2026-08-18');
    });
  });

  describe('isValidDateStr', () => {
    test('accepts valid dates', () => {
      expect(isValidDateStr('2026-08-18')).toBe(true);
      expect(isValidDateStr('2026-01-01')).toBe(true);
      expect(isValidDateStr('2026-12-31')).toBe(true);
    });

    test('rejects invalid dates', () => {
      expect(isValidDateStr('2026-02-30')).toBe(false);
      expect(isValidDateStr('not-a-date')).toBe(false);
      expect(isValidDateStr('2026-13-01')).toBe(false);
      expect(isValidDateStr('')).toBe(false);
      expect(isValidDateStr('2026-1-1')).toBe(false);
    });
  });

  describe('daysBetween', () => {
    test('counts inclusive days', () => {
      expect(daysBetween('2026-08-12', '2026-08-18')).toBe(7);
      expect(daysBetween('2026-08-18', '2026-08-18')).toBe(1);
      expect(daysBetween('2026-08-11', '2026-08-17')).toBe(7);
    });
  });

  describe('addDaysToDateStr', () => {
    test('adds days forward', () => {
      expect(addDaysToDateStr('2026-08-12', 6)).toBe('2026-08-18');
    });

    test('subtracts days backward', () => {
      expect(addDaysToDateStr('2026-08-18', -6)).toBe('2026-08-12');
    });

    test('handles month boundaries', () => {
      expect(addDaysToDateStr('2026-08-01', -1)).toBe('2026-07-31');
      expect(addDaysToDateStr('2026-07-31', 1)).toBe('2026-08-01');
    });
  });

  describe('getRollingSevenDayWindow', () => {
    test('Window A: endDate=2026-08-18 → Aug 12-18', () => {
      const w = getRollingSevenDayWindow('2026-08-18');
      expect(w.startDate).toBe('2026-08-12');
      expect(w.endDate).toBe('2026-08-18');
      expect(w.dates).toHaveLength(7);
      expect(w.dates).toEqual([
        '2026-08-12', '2026-08-13', '2026-08-14', '2026-08-15',
        '2026-08-16', '2026-08-17', '2026-08-18',
      ]);
    });

    test('Window B: endDate=2026-08-17 → Aug 11-17', () => {
      const w = getRollingSevenDayWindow('2026-08-17');
      expect(w.startDate).toBe('2026-08-11');
      expect(w.endDate).toBe('2026-08-17');
      expect(w.dates).toHaveLength(7);
      expect(w.dates).toEqual([
        '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14',
        '2026-08-15', '2026-08-16', '2026-08-17',
      ]);
    });

    test('Window C: endDate=2026-08-16 → Aug 10-16', () => {
      const w = getRollingSevenDayWindow('2026-08-16');
      expect(w.startDate).toBe('2026-08-10');
      expect(w.endDate).toBe('2026-08-16');
      expect(w.dates).toHaveLength(7);
      expect(w.dates).toEqual([
        '2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13',
        '2026-08-14', '2026-08-15', '2026-08-16',
      ]);
    });

    test('Window D: endDate=2026-08-15 → Aug 09-15', () => {
      const w = getRollingSevenDayWindow('2026-08-15');
      expect(w.startDate).toBe('2026-08-09');
      expect(w.endDate).toBe('2026-08-15');
      expect(w.dates).toHaveLength(7);
      expect(w.dates).toEqual([
        '2026-08-09', '2026-08-10', '2026-08-11', '2026-08-12',
        '2026-08-13', '2026-08-14', '2026-08-15',
      ]);
    });

    test('each window has exactly 7 consecutive dates', () => {
      for (let offset = 0; offset < 10; offset++) {
        const end = addDaysToDateStr('2026-08-18', -offset);
        const w = getRollingSevenDayWindow(end);
        expect(w.dates).toHaveLength(7);
        for (let i = 1; i < 7; i++) {
          expect(addDaysToDateStr(w.dates[i - 1], 1)).toBe(w.dates[i]);
        }
      }
    });

    test('rolling by 1 day shifts both start and end by 1', () => {
      const w1 = getRollingSevenDayWindow('2026-08-18');
      const w2 = getRollingSevenDayWindow('2026-08-17');
      expect(addDaysToDateStr(w2.startDate, 1)).toBe(w1.startDate);
      expect(addDaysToDateStr(w2.endDate, 1)).toBe(w1.endDate);
    });
  });

  describe('getLocalDatesInRange', () => {
    test('generates all dates inclusive', () => {
      const dates = getLocalDatesInRange('2026-08-12', '2026-08-18');
      expect(dates).toHaveLength(7);
      expect(dates[0]).toBe('2026-08-12');
      expect(dates[6]).toBe('2026-08-18');
    });

    test('single date returns array of 1', () => {
      const dates = getLocalDatesInRange('2026-08-18', '2026-08-18');
      expect(dates).toHaveLength(1);
      expect(dates[0]).toBe('2026-08-18');
    });
  });

  describe('clampToToday', () => {
    test('clamps future date to today', () => {
      const today = getTodayLocal();
      expect(clampToToday('2099-01-01')).toBe(today);
    });

    test('passes through past date unchanged', () => {
      expect(clampToToday('2020-01-01')).toBe('2020-01-01');
    });
  });
});

describe('calculateStats', () => {
  test('calculates correct percentages from aggregated totals', () => {
    // Window A totals: 7 days worth
    const totalGood = 2940 + 4590 + 540 + 1800 + 1200 + 3840 + 990; // 15900
    const totalBad = 1260 + 810 + 360 + 1200 + 1200 + 960 + 810;    // 6600
    const totalMonitoring = totalGood + totalBad;                       // 22500

    const result = calculateStats(totalGood, totalBad, {
      'Forward Head': 756 + 486 + 360 + 600 + 384 + 405,
      'Slouching': 252 + 360 + 216 + 576 + 162,
      'Leaning Left': 252 + 480,
      'Leaning Right': 324 + 243,
      'Too Close': 144,
      'Shoulder Tilt': 360,
      'Leaning Back': 240,
    });

    expect(result.monitoringDurationSeconds).toBe(totalMonitoring);
    const expectedBadPct = Number(((totalBad / totalMonitoring) * 100).toFixed(1));
    expect(result.badPosturePercentage).toBe(expectedBadPct);
    // Good + Bad ≈ 100%
    expect(Math.abs(result.badPosturePercentage + result.goodPosturePercentage - 100)).toBeLessThan(0.5);
  });

  test('handles zero monitoring safely', () => {
    const result = calculateStats(0, 0, {});
    expect(result.monitoringDurationSeconds).toBe(0);
    expect(result.badPosturePercentage).toBe(0);
    expect(result.goodPosturePercentage).toBe(0);
    expect(result.mostFrequentBadPosture).toBeNull();
  });

  test('most frequent bad posture is by accumulated duration', () => {
    const result = calculateStats(0, 1000, {
      'Forward Head': 200,
      'Slouching': 700,
      'Leaning Right': 100,
    });
    expect(result.mostFrequentBadPosture).toBe('Slouching');
  });

  test('percentages use aggregated totals, NOT averaged daily percentages', () => {
    // Day 1: 100s monitoring, 90s bad = 90% bad
    // Day 2: 900s monitoring, 90s bad = 10% bad
    // Wrong (average): (90% + 10%) / 2 = 50%
    // Correct (aggregated): 180/1000 = 18%
    const result = calculateStats(
      (100 - 90) + (900 - 90), // good: 10 + 810 = 820
      90 + 90,                  // bad: 180
      { 'Slouching': 180 }
    );
    expect(result.monitoringDurationSeconds).toBe(1000);
    expect(result.badPosturePercentage).toBe(18.0);
    expect(result.goodPosturePercentage).toBe(82.0);
  });
});

describe('Seed Data Mathematical Consistency', () => {
  // Same seed data structure
  const SEED_DATA = [
    { localDate: '2026-08-09', monitoring: 2700, good: 1890, bad: 810, types: { 'Forward Head': 486, 'Slouching': 324 } },
    { localDate: '2026-08-10', monitoring: 3600, good: 2520, bad: 1080, types: { 'Forward Head': 648, 'Leaning Right': 432 } },
    { localDate: '2026-08-11', monitoring: 1200, good: 420, bad: 780, types: { 'Slouching': 546, 'Shoulder Tilt': 234 } },
    { localDate: '2026-08-12', monitoring: 4200, good: 2940, bad: 1260, types: { 'Forward Head': 756, 'Slouching': 252, 'Leaning Left': 252 } },
    { localDate: '2026-08-13', monitoring: 5400, good: 4590, bad: 810, types: { 'Forward Head': 486, 'Leaning Right': 324 } },
    { localDate: '2026-08-14', monitoring: 900, good: 540, bad: 360, types: { 'Slouching': 216, 'Too Close': 144 } },
    { localDate: '2026-08-15', monitoring: 3000, good: 1800, bad: 1200, types: { 'Leaning Left': 480, 'Slouching': 360, 'Forward Head': 360 } },
    { localDate: '2026-08-16', monitoring: 2400, good: 1200, bad: 1200, types: { 'Forward Head': 600, 'Shoulder Tilt': 360, 'Leaning Back': 240 } },
    { localDate: '2026-08-17', monitoring: 4800, good: 3840, bad: 960, types: { 'Slouching': 576, 'Forward Head': 384 } },
    { localDate: '2026-08-18', monitoring: 1800, good: 990, bad: 810, types: { 'Forward Head': 405, 'Leaning Right': 243, 'Slouching': 162 } },
  ];

  test('every day: good + bad === monitoring', () => {
    for (const day of SEED_DATA) {
      expect(day.good + day.bad).toBe(day.monitoring);
    }
  });

  test('every day: sum of postureTypeDurations === bad', () => {
    for (const day of SEED_DATA) {
      const sum = Object.values(day.types).reduce((a, b) => a + b, 0);
      expect(sum).toBe(day.bad);
    }
  });

  test('monitoring is within 15-90 minutes range', () => {
    for (const day of SEED_DATA) {
      expect(day.monitoring).toBeGreaterThanOrEqual(15 * 60);
      expect(day.monitoring).toBeLessThanOrEqual(90 * 60);
    }
  });

  test('bad percentage varies between ~15% and ~65%', () => {
    for (const day of SEED_DATA) {
      const badPct = (day.bad / day.monitoring) * 100;
      expect(badPct).toBeGreaterThanOrEqual(15);
      expect(badPct).toBeLessThanOrEqual(65);
    }
  });

  // ─── Reconciliation across all 4 specified windows ───
  const WINDOWS = [
    { name: 'A', from: '2026-08-12', to: '2026-08-18' },
    { name: 'B', from: '2026-08-11', to: '2026-08-17' },
    { name: 'C', from: '2026-08-10', to: '2026-08-16' },
    { name: 'D', from: '2026-08-09', to: '2026-08-15' },
  ];

  for (const win of WINDOWS) {
    test(`Window ${win.name} (${win.from}..${win.to}): history sum matches aggregated report`, () => {
      const daysInRange = SEED_DATA.filter(d => d.localDate >= win.from && d.localDate <= win.to);
      expect(daysInRange).toHaveLength(7);

      const histGood = daysInRange.reduce((s, d) => s + d.good, 0);
      const histBad = daysInRange.reduce((s, d) => s + d.bad, 0);
      const histMon = histGood + histBad;

      // Use calculateStats as the report would
      const combinedTypes = {};
      for (const d of daysInRange) {
        for (const [type, dur] of Object.entries(d.types)) {
          combinedTypes[type] = (combinedTypes[type] || 0) + dur;
        }
      }

      const stats = calculateStats(histGood, histBad, combinedTypes);
      expect(stats.monitoringDurationSeconds).toBe(histMon);
      expect(stats.goodDurationSeconds).toBe(histGood);
      expect(stats.badDurationSeconds).toBe(histBad);
      expect(Math.abs(stats.badPosturePercentage + stats.goodPosturePercentage - 100)).toBeLessThan(0.5);
    });
  }
});
