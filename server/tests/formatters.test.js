/**
 * Formatter utility tests
 */
const { formatDuration, calcPercentage } = require('../utils/formatters');

describe('formatDuration', () => {
  test('should format 0 seconds', () => {
    expect(formatDuration(0)).toBe('00:00:00');
  });

  test('should format seconds only', () => {
    expect(formatDuration(45)).toBe('00:00:45');
  });

  test('should format minutes and seconds', () => {
    expect(formatDuration(3037)).toBe('00:50:37');
  });

  test('should format hours', () => {
    expect(formatDuration(6734)).toBe('01:52:14');
  });

  test('should format exact hour', () => {
    expect(formatDuration(7200)).toBe('02:00:00');
  });

  test('should handle negative input', () => {
    expect(formatDuration(-5)).toBe('00:00:00');
  });
});

describe('calcPercentage', () => {
  test('should calculate correct percentage', () => {
    expect(calcPercentage(25, 100)).toBe(25.0);
  });

  test('should handle zero total', () => {
    expect(calcPercentage(25, 0)).toBe(0);
  });

  test('should round to specified decimals', () => {
    expect(calcPercentage(1, 3, 2)).toBe(33.33);
  });
});
