import {
  calculateHumanPerformanceResult,
  categorizeSmoothness,
} from './humanPerformanceScore';

describe('categorizeSmoothness', () => {
  it('labels 100 as Excellent', () => {
    expect(categorizeSmoothness(100)).toBe('Excellent');
  });

  it('labels exactly 90 as Excellent', () => {
    expect(categorizeSmoothness(90)).toBe('Excellent');
  });

  it('labels 89 as Good', () => {
    expect(categorizeSmoothness(89)).toBe('Good');
  });

  it('labels exactly 80 as Good', () => {
    expect(categorizeSmoothness(80)).toBe('Good');
  });

  it('labels 79 as Fair', () => {
    expect(categorizeSmoothness(79)).toBe('Fair');
  });

  it('labels exactly 70 as Fair', () => {
    expect(categorizeSmoothness(70)).toBe('Fair');
  });

  it('labels 69 as Needs Improvement', () => {
    expect(categorizeSmoothness(69)).toBe('Needs Improvement');
  });

  it('labels 0 as Needs Improvement', () => {
    expect(categorizeSmoothness(0)).toBe('Needs Improvement');
  });
});

describe('calculateHumanPerformanceResult', () => {
  it('returns null for an empty samples array', () => {
    expect(calculateHumanPerformanceResult([])).toBeNull();
  });

  it('returns null with a single sample (cannot compute jerk)', () => {
    expect(calculateHumanPerformanceResult([1.0])).toBeNull();
  });

  it('scores 100 for a perfectly steady acceleration trace', () => {
    // |a| constant → no jerk → 100, Excellent
    const result = calculateHumanPerformanceResult([
      1.0, 1.0, 1.0, 1.0, 1.0,
    ]);
    expect(result?.average_jerk).toBe(0);
    expect(result?.smoothness_score).toBe(100);
    expect(result?.performance_level).toBe('Excellent');
  });

  it('reports range_of_motion = max − min of |a|', () => {
    const result = calculateHumanPerformanceResult([1.0, 1.2, 1.1, 0.9]);
    expect(result?.range_of_motion).toBeCloseTo(0.3, 4);
  });

  it('reports samples_collected = input length', () => {
    const samples = [1.0, 1.1, 1.2, 1.1, 1.0];
    const result = calculateHumanPerformanceResult(samples);
    expect(result?.samples_collected).toBe(samples.length);
  });

  it('scores a small steady jerk highly', () => {
    // Alternating 1.0 / 1.01 → jerk 0.01 → 100 - 2 = 98
    const result = calculateHumanPerformanceResult([
      1.0, 1.01, 1.0, 1.01, 1.0, 1.01,
    ]);
    expect(result?.smoothness_score).toBeGreaterThanOrEqual(95);
  });

  it('scores a jerk of 0.05 as 90 (Excellent boundary)', () => {
    // |a| jumps 0.05 each tick → 100 - 0.05*200 = 90
    const result = calculateHumanPerformanceResult([1.0, 1.05, 1.0, 1.05]);
    expect(result?.smoothness_score).toBe(90);
    expect(result?.performance_level).toBe('Excellent');
  });

  it('scores a jerk of 0.10 as 80 (Good boundary)', () => {
    const result = calculateHumanPerformanceResult([1.0, 1.1, 1.0, 1.1]);
    expect(result?.smoothness_score).toBe(80);
    expect(result?.performance_level).toBe('Good');
  });

  it('scores a jerk of 0.15 as 70 (Fair boundary)', () => {
    const result = calculateHumanPerformanceResult([1.0, 1.15, 1.0, 1.15]);
    expect(result?.smoothness_score).toBe(70);
    expect(result?.performance_level).toBe('Fair');
  });

  it('scores very jerky motion as Needs Improvement', () => {
    // Jerk 0.3 → 100 - 60 = 40
    const result = calculateHumanPerformanceResult([1.0, 1.3, 1.0, 1.3]);
    expect(result?.smoothness_score).toBe(40);
    expect(result?.performance_level).toBe('Needs Improvement');
  });

  it('clamps the score to 0 for extremely jerky traces', () => {
    const result = calculateHumanPerformanceResult([
      0, 3, 0, 3, 0, 3,
    ]);
    expect(result?.smoothness_score).toBe(0);
    expect(result?.performance_level).toBe('Needs Improvement');
  });

  it('returns an integer smoothness_score', () => {
    const result = calculateHumanPerformanceResult([1.0, 1.03, 1.0, 1.03]);
    // jerk 0.03 → 100 - 6 = 94
    expect(result?.smoothness_score).toBe(94);
    expect(Number.isInteger(result?.smoothness_score)).toBe(true);
  });
});
