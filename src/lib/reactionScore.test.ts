import {
  calculateReactionResult,
  PERFECT_REACTION_MS,
  MS_PER_POINT,
} from './reactionScore';

describe('calculateReactionResult', () => {
  it('returns null for an empty times array', () => {
    expect(calculateReactionResult([])).toBeNull();
  });

  it('returns null if any time is zero', () => {
    expect(calculateReactionResult([300, 0, 400])).toBeNull();
  });

  it('returns null if any time is negative', () => {
    expect(calculateReactionResult([300, -50, 400])).toBeNull();
  });

  it('returns the raw reaction_times unchanged', () => {
    const times = [250, 310, 290];
    const result = calculateReactionResult(times);
    expect(result?.reaction_times).toEqual(times);
  });

  it('calculates the average reaction time', () => {
    const result = calculateReactionResult([200, 300, 400]);
    expect(result?.average_ms).toBeCloseTo(300, 5);
  });

  it('identifies the fastest reaction', () => {
    const result = calculateReactionResult([350, 240, 410]);
    expect(result?.fastest_ms).toBe(240);
  });

  it('scores a 200 ms average as 100 (perfect)', () => {
    const result = calculateReactionResult([200, 200, 200]);
    expect(result?.reaction_score).toBe(100);
  });

  it('scores a 1000 ms average as 0', () => {
    // 100 - (1000 - 200) / 8 = 100 - 100 = 0
    const result = calculateReactionResult([1000, 1000, 1000]);
    expect(result?.reaction_score).toBe(0);
  });

  it('scores a 600 ms average as 50 (midpoint)', () => {
    // 100 - (600 - 200) / 8 = 100 - 50 = 50
    const result = calculateReactionResult([600, 600, 600]);
    expect(result?.reaction_score).toBe(50);
  });

  it('docks 1 point per MS_PER_POINT slower than perfect', () => {
    // 208 ms = perfect + 1 step → 99
    const result = calculateReactionResult([
      PERFECT_REACTION_MS + MS_PER_POINT,
    ]);
    expect(result?.reaction_score).toBe(99);
  });

  it('clamps the score to 100 for sub-200 ms averages', () => {
    // Faster than the perfect threshold should not exceed 100.
    const result = calculateReactionResult([100, 120, 150]);
    expect(result?.reaction_score).toBe(100);
  });

  it('clamps the score to 0 for very slow averages', () => {
    const result = calculateReactionResult([5000, 5000]);
    expect(result?.reaction_score).toBe(0);
  });

  it('rounds the reaction_score to an integer', () => {
    // 1 reading at 305 → 100 - (305 - 200)/8 = 100 - 13.125 = 86.875 → 87
    const result = calculateReactionResult([305]);
    expect(result?.reaction_score).toBe(87);
    expect(Number.isInteger(result?.reaction_score)).toBe(true);
  });
});
