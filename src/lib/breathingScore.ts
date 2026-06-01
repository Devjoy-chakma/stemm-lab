// =====================================================================
// Pure functions for Breathing Pace scoring.
//
// The activity is a guided 15-second inhale/exhale session — the phone
// doesn't actually measure breathing, it sets a pace and rewards seeing
// the session through. Score is honest: completion percentage of the
// target duration. Future work could replace this with a real metric
// (e.g. chest-accelerometer breathing detection).
// =====================================================================

export const INHALE_DURATION_SECONDS = 4;
export const EXHALE_DURATION_SECONDS = 4;
export const CYCLE_DURATION_SECONDS =
  INHALE_DURATION_SECONDS + EXHALE_DURATION_SECONDS;

export type FocusLevel = 'Excellent' | 'Good' | 'Fair' | 'Incomplete';

export interface BreathingResult {
  duration_completed_seconds: number;   // clamped to target
  target_duration_seconds: number;
  completion_percent: number;           // 0-100
  breathing_cycles: number;             // approximate cycles based on pace
  completion_score: number;             // 0-100, the value persisted
  focus_level: FocusLevel;
}

/**
 * Map a completion percentage (0-100) to a qualitative label.
 */
export function categorizeFocus(completionPercent: number): FocusLevel {
  if (completionPercent >= 100) return 'Excellent';
  if (completionPercent >= 75) return 'Good';
  if (completionPercent >= 50) return 'Fair';
  return 'Incomplete';
}

/**
 * Compute the breathing-session result.
 *
 * @param durationCompletedSeconds - How long the user stayed with the
 *        guided animation (≥ 0). Excess over the target is clamped.
 * @param targetDurationSeconds - The session's target duration (> 0).
 * @returns Computed metrics, or null if inputs are invalid.
 */
export function calculateBreathingResult(
  durationCompletedSeconds: number,
  targetDurationSeconds: number
): BreathingResult | null {
  if (targetDurationSeconds <= 0) return null;
  if (durationCompletedSeconds < 0) return null;

  const clamped = Math.min(durationCompletedSeconds, targetDurationSeconds);
  const completion_percent = Math.round(
    (clamped / targetDurationSeconds) * 100
  );
  const breathing_cycles = Math.round(clamped / CYCLE_DURATION_SECONDS);

  return {
    duration_completed_seconds: clamped,
    target_duration_seconds: targetDurationSeconds,
    completion_percent,
    breathing_cycles,
    completion_score: completion_percent,
    focus_level: categorizeFocus(completion_percent),
  };
}
