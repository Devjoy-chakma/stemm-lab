// =====================================================================
// Pure functions for Hand Fan Challenge scoring.
// =====================================================================

export interface HandFanResult {
  total_fans: number;
  duration_seconds: number;
  fans_per_second: number;
  efficiency_score: number; // 0-100, higher is better
}

/**
 * Calculate Hand Fan Challenge result.
 *
 * Lower fans-per-second = more efficient (better fan design).
 * efficiency_score = clamp((1 / fans_per_second) * 50, 0, 100)
 *
 * @param totalFans - Number of fan motions counted
 * @param durationSeconds - How long the run took
 * @returns Computed metrics, or null if inputs invalid
 */
export function calculateHandFanResult(
  totalFans: number,
  durationSeconds: number
): HandFanResult | null {
  if (totalFans <= 0) return null;
  if (durationSeconds <= 0) return null;

  const fans_per_second = totalFans / durationSeconds;
  const rawScore = (1 / fans_per_second) * 50;
  const efficiency_score = Math.max(0, Math.min(100, Math.round(rawScore)));

  return {
    total_fans: totalFans,
    duration_seconds: durationSeconds,
    fans_per_second,
    efficiency_score,
  };
}