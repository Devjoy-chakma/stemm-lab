// =====================================================================
// Pure functions for Reaction Board scoring (spec-aligned, 3 phases).
//
// Phase 1 — Tap Reaction         (dominant hand): per-round reaction
//                                 times in ms. Faster average = higher
//                                 score (200 ms → 100, each +8 ms → −1).
// Phase 2 — Swap Hands           (non-dominant hand): same scoring as
//                                 Phase 1; the comparison vs Phase 1 is
//                                 itself the interesting result.
// Phase 3 — Tracing Challenge    : per-tick deviation (pixels) between
//                                 the user's finger and a moving target.
//                                 Lower average deviation = higher
//                                 tracing score.
// =====================================================================

export const PERFECT_REACTION_MS = 200;
export const MS_PER_POINT = 8;

// Tracing scoring constants:
//   0 px deviation  → 100
//   100 px deviation → 0
// (linear between, clamped both ends.)
export const PERFECT_TRACING_PX = 0;
export const ZERO_TRACING_PX = 100;

export interface ReactionResult {
  reaction_times: number[];    // raw per-round times in ms
  average_ms: number;
  fastest_ms: number;
  reaction_score: number;      // 0-100
}

export interface TracingResult {
  deviations_px: number[];     // raw per-tick deviations
  average_deviation_px: number;
  samples_collected: number;
  tracing_score: number;       // 0-100
}

export interface ReactionBoardResult {
  phase1: ReactionResult;
  phase2: ReactionResult;
  phase3: TracingResult;
  hand_diff_ms: number;        // phase2.average_ms − phase1.average_ms
  overall_score: number;       // 0-100, mean of the three phase scores
}

/**
 * Compute the result from a list of per-round reaction times.
 *
 * @param times - Reaction times in ms (must have at least one entry,
 *                all strictly positive)
 * @returns Result, or null if inputs are invalid
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

/**
 * Compute the result from a list of per-tick deviations.
 *
 * @param deviations - Pixel distances between finger and target,
 *                    sampled periodically. Must be ≥ 0; must have at
 *                    least one entry.
 * @returns Result, or null if inputs are invalid
 */
export function calculateTracingResult(
  deviations: number[]
): TracingResult | null {
  if (deviations.length === 0) return null;
  if (deviations.some((d) => d < 0)) return null;

  const average_deviation_px =
    deviations.reduce((a, b) => a + b, 0) / deviations.length;

  // Score: 0 px → 100, 100 px → 0, clamped.
  const tracing_score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        100 -
          ((average_deviation_px - PERFECT_TRACING_PX) /
            (ZERO_TRACING_PX - PERFECT_TRACING_PX)) *
            100
      )
    )
  );

  return {
    deviations_px: deviations,
    average_deviation_px,
    samples_collected: deviations.length,
    tracing_score,
  };
}

/**
 * Combine all three phases into the final attempt result.
 *
 * @returns Combined result, or null if any phase's input is invalid
 */
export function calculateReactionBoardResult(
  phase1Times: number[],
  phase2Times: number[],
  phase3Deviations: number[]
): ReactionBoardResult | null {
  const phase1 = calculateReactionResult(phase1Times);
  const phase2 = calculateReactionResult(phase2Times);
  const phase3 = calculateTracingResult(phase3Deviations);
  if (!phase1 || !phase2 || !phase3) return null;

  const hand_diff_ms = phase2.average_ms - phase1.average_ms;
  const overall_score = Math.round(
    (phase1.reaction_score + phase2.reaction_score + phase3.tracing_score) / 3
  );

  return {
    phase1,
    phase2,
    phase3,
    hand_diff_ms,
    overall_score,
  };
}
