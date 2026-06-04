import {
  calculateParachuteResult,
  calculateImprovement,
  GRAVITY,
  DEFAULT_TOY_MASS_KG,
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

  it('returns null for non-positive mass', () => {
    expect(calculateParachuteResult(2, [1.0], 0)).toBeNull();
    expect(calculateParachuteResult(2, [1.0], -0.1)).toBeNull();
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

  it('returns final velocity (v = 2h/t), not average velocity', () => {
    // 2m drop in 1s → final velocity = 2*2/1 = 4 m/s
    const result = calculateParachuteResult(2, [1.0]);
    expect(result?.velocity).toBeCloseTo(4.0, 5);
  });

  it('returns acceleration consistent with the kinematic formula', () => {
    // 2m drop in 1s → a = 2*2/1² = 4 m/s²
    const result = calculateParachuteResult(2, [1.0]);
    expect(result?.acceleration).toBeCloseTo(4.0, 5);
  });

  it('drag force scales linearly with mass', () => {
    const slow = calculateParachuteResult(2, [4.0], 0.1);
    const heavy = calculateParachuteResult(2, [4.0], 0.5);
    // Both have the same acceleration; F_drag = m(g - a) ⇒ heavy is 5× slow.
    expect(heavy?.dragForce).toBeCloseTo((slow?.dragForce ?? 0) * 5, 4);
  });

  it('uses DEFAULT_TOY_MASS_KG when mass argument omitted', () => {
    const a = calculateParachuteResult(2, [4.0]);
    const b = calculateParachuteResult(2, [4.0], DEFAULT_TOY_MASS_KG);
    expect(a?.dragForce).toBe(b?.dragForce);
  });

  it('returns impactGForce = null when contact time not provided', () => {
    const result = calculateParachuteResult(2, [1.0]);
    expect(result?.impactGForce).toBeNull();
  });

  it('returns impactGForce = null when contact time is zero or negative', () => {
    expect(calculateParachuteResult(2, [1.0], 0.2, 0)?.impactGForce).toBeNull();
    expect(
      calculateParachuteResult(2, [1.0], 0.2, -0.05)?.impactGForce
    ).toBeNull();
  });

  it('computes impact g-force as Δv / (Δt · g) when contact time given', () => {
    // 2m drop in 1s → v_final = 4 m/s; contact time 0.05s
    //   g_impact = 4 / (0.05 * 9.8) ≈ 8.163
    const result = calculateParachuteResult(2, [1.0], 0.2, 0.05);
    expect(result?.impactGForce).toBeCloseTo(4 / (0.05 * GRAVITY), 5);
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
