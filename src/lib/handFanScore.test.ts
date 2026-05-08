import { calculateHandFanResult } from './handFanScore';

describe('calculateHandFanResult', () => {
  it('returns null for zero fans', () => {
    expect(calculateHandFanResult(0, 10)).toBeNull();
  });

  it('returns null for negative fans', () => {
    expect(calculateHandFanResult(-5, 10)).toBeNull();
  });

  it('returns null for zero duration', () => {
    expect(calculateHandFanResult(20, 0)).toBeNull();
  });

  it('returns null for negative duration', () => {
    expect(calculateHandFanResult(20, -5)).toBeNull();
  });

  it('calculates fans per second correctly', () => {
    // 30 fans in 10 seconds = 3 fans/second
    const result = calculateHandFanResult(30, 10);
    expect(result?.fans_per_second).toBeCloseTo(3.0, 5);
  });

  it('returns total_fans and duration_seconds unchanged', () => {
    const result = calculateHandFanResult(25, 12.5);
    expect(result?.total_fans).toBe(25);
    expect(result?.duration_seconds).toBe(12.5);
  });

  it('gives high score for slow, deliberate fanning (0.5/s)', () => {
    // 0.5 fans/second → (1 / 0.5) * 50 = 100
    const result = calculateHandFanResult(5, 10);
    expect(result?.efficiency_score).toBe(100);
  });

  it('gives a 50 score for 1 fan per second', () => {
    // 1 fan/second → (1 / 1) * 50 = 50
    const result = calculateHandFanResult(10, 10);
    expect(result?.efficiency_score).toBe(50);
  });

  it('gives a low score for rapid panicked fanning (4/s)', () => {
    // 4 fans/second → (1 / 4) * 50 = 12.5 → 13
    const result = calculateHandFanResult(40, 10);
    expect(result?.efficiency_score).toBe(13);
  });

  it('clamps efficiency_score to 100 maximum', () => {
    // Very slow fanning (0.1/s) → raw score 500 → clamped to 100
    const result = calculateHandFanResult(1, 10);
    expect(result?.efficiency_score).toBe(100);
  });

  it('clamps efficiency_score to 0 minimum', () => {
    // Score is naturally always positive given valid inputs,
    // but just in case the formula changes
    const result = calculateHandFanResult(1000, 1);
    expect(result?.efficiency_score).toBeGreaterThanOrEqual(0);
  });

  it('rounds efficiency_score to integer', () => {
    // 7 fans in 5 seconds = 1.4 fans/sec → (1/1.4)*50 = 35.71... → 36
    const result = calculateHandFanResult(7, 5);
    expect(result?.efficiency_score).toBe(36);
    expect(Number.isInteger(result?.efficiency_score)).toBe(true);
  });
});