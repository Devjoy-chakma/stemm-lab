import {
  calculateParachuteResult,
  calculateImprovement,
  GRAVITY,
} from './parachuteScore';

describe('calculateParachuteResult', () => {
  it('returns null for zero height', () => {
    expect(calculateParachuteResult(0, [1.0])).toBeNull();
  });

  it('returns null for negative height', () => {
    expect(calculateParachuteResult(-1, [1.0])).toBeNull();
  });

  it('returns null for empty attempts', () => {
    expect(calculateParachuteResult(2, [])).toBeNull();
  });

  it('returns null when any attempt is zero or negative', () => {
    expect(calculateParachuteResult(2, [1.0, 0, 1.0])).toBeNull();
    expect(calculateParachuteResult(2, [1.0, -0.5, 1.0])).toBeNull();
  });

  it('averages multiple attempts correctly', () => {
    const result = calculateParachuteResult(2, [1.0, 2.0, 3.0]);
    expect(result?.avgTime).toBeCloseTo(2.0, 5);
  });

  it('calculates a score of 0 for free-fall (no parachute drag)', () => {
    // Free-fall from 2m: t = sqrt(2*2/9.8) ≈ 0.639s
    const freefallTime = Math.sqrt((2 * 2) / GRAVITY);
    const result = calculateParachuteResult(2, [freefallTime]);
    expect(result?.dragScore).toBe(0);
  });

  it('gives a high score for a slow drop (good parachute)', () => {
    // 2m drop in 4 seconds = very slow → high drag score
    const result = calculateParachuteResult(2, [4.0]);
    expect(result?.dragScore).toBeGreaterThan(95);
  });

  it('clamps dragScore to 0 even when acceleration exceeds gravity', () => {
    // Impossible scenario: drops faster than gravity
    // Using a tiny time (large acceleration) to test clamp
    const result = calculateParachuteResult(2, [0.1]);
    expect(result?.dragScore).toBe(0);
  });

  it('calculates velocity correctly', () => {
    // 2m in 1s → 2 m/s average velocity
    const result = calculateParachuteResult(2, [1.0]);
    expect(result?.velocity).toBeCloseTo(2.0, 5);
  });

  it('calculates g-force as ratio to gravity', () => {
    // 2m in 0.639s → ~9.8 m/s² acceleration → g-force ~1.0
    const freefallTime = Math.sqrt((2 * 2) / GRAVITY);
    const result = calculateParachuteResult(2, [freefallTime]);
    expect(result?.gForce).toBeCloseTo(1.0, 2);
  });
});

describe('calculateImprovement', () => {
  it('returns null when no previous score', () => {
    expect(calculateImprovement(50, null)).toBeNull();
  });

  it('returns null when previous score is zero (no improvement basis)', () => {
    expect(calculateImprovement(50, 0)).toBeNull();
  });

  it('returns positive percentage when improved', () => {
    expect(calculateImprovement(60, 50)).toBe(20);
  });

  it('returns negative percentage when worse', () => {
    expect(calculateImprovement(40, 50)).toBe(-20);
  });

  it('returns 0 when no change', () => {
    expect(calculateImprovement(50, 50)).toBe(0);
  });

  it('rounds to nearest integer', () => {
    // 50 → 51 = 2% improvement (1/50)
    expect(calculateImprovement(51, 50)).toBe(2);
  });
});