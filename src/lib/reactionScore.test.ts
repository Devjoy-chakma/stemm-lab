import {
  calculateReactionResult,
  calculateTracingResult,
  calculateReactionBoardResult,
  PERFECT_REACTION_MS,
  MS_PER_POINT,
  ZERO_TRACING_PX,
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
    const result = calculateReactionResult([1000, 1000, 1000]);
    expect(result?.reaction_score).toBe(0);
  });

  it('scores a 600 ms average as 50 (midpoint)', () => {
    const result = calculateReactionResult([600, 600, 600]);
    expect(result?.reaction_score).toBe(50);
  });

  it('docks 1 point per MS_PER_POINT slower than perfect', () => {
    const result = calculateReactionResult([
      PERFECT_REACTION_MS + MS_PER_POINT,
    ]);
    expect(result?.reaction_score).toBe(99);
  });

  it('clamps the score to 100 for sub-200 ms averages', () => {
    const result = calculateReactionResult([100, 120, 150]);
    expect(result?.reaction_score).toBe(100);
  });

  it('clamps the score to 0 for very slow averages', () => {
    const result = calculateReactionResult([5000, 5000]);
    expect(result?.reaction_score).toBe(0);
  });

  it('rounds the reaction_score to an integer', () => {
    const result = calculateReactionResult([305]);
    expect(result?.reaction_score).toBe(87);
    expect(Number.isInteger(result?.reaction_score)).toBe(true);
  });
});

describe('calculateTracingResult', () => {
  it('returns null for an empty deviations array', () => {
    expect(calculateTracingResult([])).toBeNull();
  });

  it('returns null if any deviation is negative', () => {
    expect(calculateTracingResult([10, -1, 20])).toBeNull();
  });

  it('returns 100 score for zero average deviation', () => {
    const result = calculateTracingResult([0, 0, 0]);
    expect(result?.tracing_score).toBe(100);
    expect(result?.average_deviation_px).toBe(0);
  });

  it('returns 0 score at the zero-tracing threshold', () => {
    const result = calculateTracingResult([
      ZERO_TRACING_PX,
      ZERO_TRACING_PX,
    ]);
    expect(result?.tracing_score).toBe(0);
  });

  it('scores 50 at half the zero-tracing threshold', () => {
    const result = calculateTracingResult([
      ZERO_TRACING_PX / 2,
      ZERO_TRACING_PX / 2,
    ]);
    expect(result?.tracing_score).toBe(50);
  });

  it('clamps the score to 0 for deviations beyond the threshold', () => {
    const result = calculateTracingResult([500, 500]);
    expect(result?.tracing_score).toBe(0);
  });

  it('reports samples_collected matching the input length', () => {
    const result = calculateTracingResult([10, 20, 30, 40]);
    expect(result?.samples_collected).toBe(4);
  });

  it('returns an integer tracing_score', () => {
    // average 33 → 100 - 33 = 67
    const result = calculateTracingResult([33]);
    expect(result?.tracing_score).toBe(67);
    expect(Number.isInteger(result?.tracing_score)).toBe(true);
  });
});

describe('calculateReactionBoardResult', () => {
  it('returns null when phase 1 has no times', () => {
    expect(
      calculateReactionBoardResult([], [300, 300, 300], [10, 20])
    ).toBeNull();
  });

  it('returns null when phase 3 has no deviations', () => {
    expect(
      calculateReactionBoardResult([300], [300], [])
    ).toBeNull();
  });

  it('computes hand_diff_ms as phase2 − phase1 average', () => {
    const result = calculateReactionBoardResult(
      [300, 300, 300],   // p1 avg = 300
      [350, 350, 350],   // p2 avg = 350
      [0]
    );
    expect(result?.hand_diff_ms).toBe(50);
  });

  it('hand_diff_ms can be negative if non-dominant is faster', () => {
    const result = calculateReactionBoardResult(
      [400, 400],   // p1 avg = 400
      [300, 300],   // p2 avg = 300
      [0]
    );
    expect(result?.hand_diff_ms).toBe(-100);
  });

  it('overall_score is the mean of the three phase scores', () => {
    const result = calculateReactionBoardResult(
      [200, 200, 200],  // p1 score = 100
      [600, 600, 600],  // p2 score = 50
      [0]               // p3 score = 100
    );
    // mean(100, 50, 100) = 83.33 → 83
    expect(result?.overall_score).toBe(83);
  });

  it('exposes all three phase results', () => {
    const result = calculateReactionBoardResult(
      [250, 250],
      [350, 350],
      [10, 20]
    );
    expect(result?.phase1.reaction_times).toEqual([250, 250]);
    expect(result?.phase2.reaction_times).toEqual([350, 350]);
    expect(result?.phase3.deviations_px).toEqual([10, 20]);
  });
});
