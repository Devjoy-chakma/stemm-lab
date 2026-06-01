// =====================================================================
// Pure functions for Human Performance (balance) scoring.
//
// Inputs: per-tick movement magnitudes (|Δx| + |Δy| + |Δz| from the
// accelerometer) captured while the user tries to hold the phone still.
//
// Smaller average movement = steadier hand = higher score.
// =====================================================================

export type PerformanceLevel =
  | 'Excellent'
  | 'Good'
  | 'Fair'
  | 'Needs Improvement';

export interface HumanPerformanceResult {
  avg_movement: number;            // rounded to 2 decimal places
  stability_score: number;         // 0-100, higher is steadier
  performance_level: PerformanceLevel;
  samples_collected: number;
}

/**
 * Map a stability score (0-100) to a qualitative label.
 */
export function categorizeStability(score: number): PerformanceLevel {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 70) return 'Fair';
  return 'Needs Improvement';
}

/**
 * Compute the result from a list of per-tick movement magnitudes.
 *
 * @param samples - Movement magnitudes (must contain at least one entry)
 * @returns Computed metrics, or null if there were no samples
 */
export function calculateHumanPerformanceResult(
  samples: number[]
): HumanPerformanceResult | null {
  if (samples.length === 0) return null;

  const rawAvg = samples.reduce((a, b) => a + b, 0) / samples.length;
  const avg_movement = Number(rawAvg.toFixed(2));

  // Each unit of average movement docks 10 points; clamp to [0, 100].
  const stability_score = Math.max(
    0,
    Math.min(100, Math.round(100 - avg_movement * 10))
  );

  return {
    avg_movement,
    stability_score,
    performance_level: categorizeStability(stability_score),
    samples_collected: samples.length,
  };
}
