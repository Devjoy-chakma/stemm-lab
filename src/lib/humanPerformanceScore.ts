// =====================================================================
// Pure functions for Human Performance Lab scoring (spec-aligned).
//
// The activity is "Stretch Speed & Gracefulness" — the user performs a
// guided arm motion while holding the phone, and we score how SMOOTH
// the motion was, not how still they kept the phone.
//
// Input: per-sample acceleration magnitudes |a| = √(x² + y² + z²) from
// the accelerometer (1.0 at rest, deviates with movement).
//
// Smoothness ~ inverse of average jerk (the per-tick change in |a|).
// Steady-velocity motion keeps |a| close to gravity; jerky stop/start
// motion spikes it.
// =====================================================================

export type PerformanceLevel =
  | 'Excellent'
  | 'Good'
  | 'Fair'
  | 'Needs Improvement';

// Calibration: avg_jerk of 0   → score 100 (perfectly smooth)
//              avg_jerk of 0.5 → score 0   (very jerky)
export const JERK_TO_SCORE_FACTOR = 200;

export interface HumanPerformanceResult {
  average_jerk: number;          // avg |a[i] − a[i-1]|
  range_of_motion: number;       // max(|a|) − min(|a|) during the session
  smoothness_score: number;      // 0-100, higher is smoother
  performance_level: PerformanceLevel;
  samples_collected: number;
}

/**
 * Map a smoothness score (0-100) to a qualitative label.
 */
export function categorizeSmoothness(score: number): PerformanceLevel {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 70) return 'Fair';
  return 'Needs Improvement';
}

/**
 * Compute the result from a list of per-sample acceleration magnitudes.
 *
 * @param accelerationMagnitudes - |a| samples (must have ≥ 2 entries)
 * @returns Computed metrics, or null if there were too few samples
 */
export function calculateHumanPerformanceResult(
  accelerationMagnitudes: number[]
): HumanPerformanceResult | null {
  if (accelerationMagnitudes.length < 2) return null;

  // Jerk = absolute change between consecutive samples.
  const jerks: number[] = [];
  for (let i = 1; i < accelerationMagnitudes.length; i++) {
    jerks.push(
      Math.abs(accelerationMagnitudes[i] - accelerationMagnitudes[i - 1])
    );
  }
  const rawAvgJerk = jerks.reduce((a, b) => a + b, 0) / jerks.length;
  const average_jerk = Number(rawAvgJerk.toFixed(4));

  const range_of_motion = Number(
    (
      Math.max(...accelerationMagnitudes) -
      Math.min(...accelerationMagnitudes)
    ).toFixed(4)
  );

  // Smoothness: lower jerk → higher score; clamped [0, 100].
  const smoothness_score = Math.max(
    0,
    Math.min(100, Math.round(100 - average_jerk * JERK_TO_SCORE_FACTOR))
  );

  return {
    average_jerk,
    range_of_motion,
    smoothness_score,
    performance_level: categorizeSmoothness(smoothness_score),
    samples_collected: accelerationMagnitudes.length,
  };
}
