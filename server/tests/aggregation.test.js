/**
 * Aggregation Service Tests — Duration calculations, percentages, most frequent posture
 */
const { calculateStats, aggregateWeeklyReport } = require('../services/aggregationService');

describe('calculateStats', () => {
  test('should calculate correct percentages', () => {
    const result = calculateStats(3600, 1200, { 'Forward Head': 800, 'Slouching': 400 });

    expect(result.monitoringDurationSeconds).toBe(4800);
    expect(result.badPosturePercentage).toBe(25.0);
    expect(result.goodPosturePercentage).toBe(75.0);
    expect(result.mostFrequentBadPosture).toBe('Forward Head');
  });

  test('should handle zero monitoring time', () => {
    const result = calculateStats(0, 0, {});

    expect(result.monitoringDurationSeconds).toBe(0);
    expect(result.badPosturePercentage).toBe(0);
    expect(result.goodPosturePercentage).toBe(0);
    expect(result.mostFrequentBadPosture).toBeNull();
  });

  test('should handle 100% bad posture', () => {
    const result = calculateStats(0, 600, { 'Slouching': 600 });

    expect(result.badPosturePercentage).toBe(100.0);
    expect(result.goodPosturePercentage).toBe(0);
    expect(result.mostFrequentBadPosture).toBe('Slouching');
  });

  test('should handle 100% good posture', () => {
    const result = calculateStats(3600, 0, {});

    expect(result.badPosturePercentage).toBe(0);
    expect(result.goodPosturePercentage).toBe(100.0);
    expect(result.mostFrequentBadPosture).toBeNull();
  });

  test('most frequent should be by duration, not count', () => {
    const result = calculateStats(0, 1000, {
      'Forward Head': 200,
      'Slouching': 700,
      'Leaning Right': 100,
    });

    expect(result.mostFrequentBadPosture).toBe('Slouching');
  });

  test('good + bad percentages should equal ~100%', () => {
    const result = calculateStats(7234, 2766, { 'Forward Head': 2766 });

    expect(Math.abs(result.badPosturePercentage + result.goodPosturePercentage - 100)).toBeLessThan(0.5);
  });
});
