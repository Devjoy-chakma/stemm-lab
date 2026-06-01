// =====================================================================
// Pure functions for Reaction Board scoring.
//
// Inputs: per-round reaction times in milliseconds (time between the
// "TAP!" prompt appearing and the user tapping the screen).
//
// Faster average reaction = higher score.
//   200 ms avg → 100 (perfect)
//   each additional 8 ms docks 1 point
//   1000 ms avg → 0
// =====================================================================

export const PERFECT_REACTION_MS = 200;
export const MS_PER_POINT = 8;

export interface ReactionResult {
  reaction_times: number[];    // raw per-round times in ms
  average_ms: number;          // mean reaction time
  fastest_ms: number;          // fastest single reaction
  reaction_score: number;      // 0-100, higher is faster
}

/**
 * Compute the result from a list of per-round reaction times.
 *
 * @param times - Reaction times in ms (must have at least one entry,
 *                all strictly positive)
 * @returns Computed metrics, or null if inputs are invalid
 */
export function calculateReactionResult(
  times: number[]
): ReactionResult | null {
  if (times.length === 0) return null;
  if (times.some((t) => t <= 0)) return null;

  const average_ms = times.reduce((a, b) => a + b, 0) / times.length;
  const fastest_ms = Math.min(...times);

  const reaction_score = Math.max(
    0,
    Math.min(
      100,
      Math.round(100 - (average_ms - PERFECT_REACTION_MS) / MS_PER_POINT)
    )
  );

  return {
    reaction_times: times,
    average_ms,
    fastest_ms,
    reaction_score,
  };
}
