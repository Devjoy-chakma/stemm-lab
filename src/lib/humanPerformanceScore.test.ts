import {
  calculateHumanPerformanceResult,
  categorizeStability,
} from './humanPerformanceScore';

describe('categorizeStability', () => {
  it('labels 100 as Excellent', () => {
    expect(categorizeStability(100)).toBe('Excellent');
  });

  it('labels exactly 90 as Excellent', () => {
    expect(categorizeStability(90)).toBe('Excellent');
  });

  it('labels 89 as Good', () => {
    expect(categorizeStability(89)).toBe('Good');
  });

  it('labels exactly 80 as Good', () => {
    expect(categorizeStability(80)).toBe('Good');
  });

  it('labels 79 as Fair', () => {
    expect(categorizeStability(79)).toBe('Fair');
  });

  it('labels exactly 70 as Fair', () => {
    expect(categorizeStability(70)).toBe('Fair');
  });

  it('labels 69 as Needs Improvement', () => {
    expect(categorizeStability(69)).toBe('Needs Improvement');
  });

  it('labels 0 as Needs Improvement', () => {
    expect(categorizeStability(0)).toBe('Needs Improvement');
  });
});

describe('calculateHumanPerformanceResult', () => {
  it('returns null for an empty samples array', () => {
    expect(calculateHumanPerformanceResult([])).toBeNull();
  });

  it('gives a perfect 100 score for total stillness', () => {
    const result = calculateHumanPerformanceResult([0, 0, 0, 0, 0]);
    expect(result?.stability_score).toBe(100);
    expect(result?.performance_level).toBe('Excellent');
    expect(result?.avg_movement).toBe(0);
  });

  it('rounds avg_movement to 2 decimal places', () => {
    // mean of these is 0.33333… → 0.33
    const result = calculateHumanPerformanceResult([0.1, 0.3, 0.6]);
    expect(result?.avg_movement).toBeCloseTo(0.33, 2);
  });

  it('returns samples_collected reflecting the input length', () => {
    const samples = [0.1, 0.2, 0.3, 0.4];
    const result = calculateHumanPerformanceResult(samples);
    expect(result?.samples_collected).toBe(samples.length);
  });

  it('scores avg movement of 1.0 as 90 (Excellent boundary)', () => {
    // 100 - 1.0 * 10 = 90 → Excellent
    const result = calculateHumanPerformanceResult([1.0, 1.0, 1.0]);
    expect(result?.stability_score).toBe(90);
    expect(result?.performance_level).toBe('Excellent');
  });

  it('scores avg movement of 2.0 as 80 (Good boundary)', () => {
    // 100 - 2.0 * 10 = 80 → Good
    const result = calculateHumanPerformanceResult([2.0, 2.0]);
    expect(result?.stability_score).toBe(80);
    expect(result?.performance_level).toBe('Good');
  });

  it('scores avg movement of 3.0 as 70 (Fair boundary)', () => {
    // 100 - 3.0 * 10 = 70 → Fair
    const result = calculateHumanPerformanceResult([3.0, 3.0]);
    expect(result?.stability_score).toBe(70);
    expect(result?.performance_level).toBe('Fair');
  });

  it('scores high movement as Needs Improvement', () => {
    // 100 - 5.0 * 10 = 50 → Needs Improvement
    const result = calculateHumanPerformanceResult([5.0, 5.0]);
    expect(result?.stability_score).toBe(50);
    expect(result?.performance_level).toBe('Needs Improvement');
  });

  it('clamps the score to 0 minimum for very high movement', () => {
    const result = calculateHumanPerformanceResult([50, 50, 50]);
    expect(result?.stability_score).toBe(0);
    expect(result?.performance_level).toBe('Needs Improvement');
  });

  it('clamps the score to 100 maximum (defensive)', () => {
    // Negative-ish movements should never happen given Math.abs in the
    // capture path, but guard against future changes to the formula.
    const result = calculateHumanPerformanceResult([-2, -2, -2]);
    expect(result?.stability_score).toBe(100);
  });

  it('returns an integer stability_score', () => {
    // avg 0.27 → 100 - 2.7 = 97.3 → 97
    const result = calculateHumanPerformanceResult([0.27]);
    expect(result?.stability_score).toBe(97);
    expect(Number.isInteger(result?.stability_score)).toBe(true);
  });
});
