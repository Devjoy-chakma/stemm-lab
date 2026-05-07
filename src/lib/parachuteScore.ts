// =====================================================================
// Pure functions for Parachute Drop scoring.
// No React, no side effects — easy to test.
// =====================================================================

export const GRAVITY = 9.8; // m/s²
export const ASSUMED_PARACHUTE_MASS_KG = 0.05; // 50g

export interface ParachuteResult {
  avgTime: number;
  velocity: number;
  acceleration: number;
  gForce: number;
  dragForce: number;
  dragScore: number;
}

/**
 * Calculate all derived values for a parachute drop.
 *
 * @param heightMeters - Drop height in meters (must be > 0)
 * @param attemptTimes - Array of drop times in seconds (must have at least 1 entry, all > 0)
 * @returns All computed metrics, or null if inputs are invalid
 */
export function calculateParachuteResult(
  heightMeters: number,
  attemptTimes: number[]
): ParachuteResult | null {
  if (heightMeters <= 0) return null;
  if (attemptTimes.length === 0) return null;
  if (attemptTimes.some((t) => t <= 0)) return null;

  const avgTime = attemptTimes.reduce((a, b) => a + b, 0) / attemptTimes.length;
  const velocity = heightMeters / avgTime;
  const acceleration = (2 * heightMeters) / (avgTime * avgTime);
  const gForce = acceleration / GRAVITY;
  const dragForce = ASSUMED_PARACHUTE_MASS_KG * (GRAVITY - acceleration);
  const dragScore = Math.max(0, Math.round((1 - acceleration / GRAVITY) * 100));

  return {
    avgTime,
    velocity,
    acceleration,
    gForce,
    dragForce,
    dragScore,
  };
}

/**
 * Calculate percentage improvement between two scores.
 *
 * @param currentScore - Current drag score
 * @param previousScore - Previous drag score
 * @returns Percentage improvement, or null if no comparison possible
 */
export function calculateImprovement(
  currentScore: number,
  previousScore: number | null
): number | null {
  if (previousScore === null || previousScore === 0) return null;
  return Math.round(((currentScore - previousScore) / previousScore) * 100);
}