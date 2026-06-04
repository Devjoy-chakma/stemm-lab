// =====================================================================
// Pure functions for Breathing Pace Trainer scoring (spec-aligned).
//
// The spec puts the phone on the chest and asks students to measure
// breaths per minute at rest, then again after exercise, and compare.
// The lib implements:
//
//   1. Breath detection from a 1-axis accelerometer trace (typically
//      the Z-axis, perpendicular to the phone screen). Chest rise/fall
//      shows up as a slow oscillation. We smooth with a moving average
//      and count local maxima above the mean, enforcing a minimum gap
//      so noise can't double-count a single breath.
//   2. BPM = peaks × 60 / duration seconds.
//   3. A combined result comparing rest vs post-exercise plus a
//      prediction-accuracy score (the spec's "were you right?").
// =====================================================================

export const MEASUREMENT_DURATION_S = 20;
export const ACCEL_SAMPLE_INTERVAL_MS = 100; // 10 Hz
export const SMOOTHING_WINDOW = 5;
export const PEAK_MIN_DISTANCE_SAMPLES = 10; // 1 s at 10 Hz

// Prediction accuracy calibration: 0 BPM error → 100, 20+ → 0.
export const MAX_PREDICTION_ERROR_BPM = 20;

export interface BreathingPhaseResult {
  bpm: number;
  peaks_detected: number;
  duration_seconds: number;
  samples_collected: number;
}

export interface BreathingResult {
  rest: BreathingPhaseResult;
  exercise: BreathingPhaseResult;
  rest_prediction_bpm: number;
  rest_prediction_error: number;
  rest_prediction_accuracy: number;   // 0-100
  bpm_increase: number;               // exercise.bpm − rest.bpm
  bpm_increase_percent: number;       // (increase / rest.bpm) × 100, 0 if rest.bpm = 0
  completion_score: number;           // alias of rest_prediction_accuracy
}

/**
 * Moving-average smoothing. Output length matches input.
 */
export function smoothMovingAverage(
  samples: number[],
  window: number = SMOOTHING_WINDOW
): number[] {
  if (samples.length === 0 || window <= 1) return [...samples];
  const out: number[] = [];
  const half = Math.floor(window / 2);
  for (let i = 0; i < samples.length; i++) {
    const start = Math.max(0, i - half);
    const end = Math.min(samples.length, i + half + 1);
    let sum = 0;
    for (let j = start; j < end; j++) sum += samples[j];
    out.push(sum / (end - start));
  }
  return out;
}

/**
 * Count breath peaks in a smoothed signal: local maxima above the mean,
 * with at least `minDistance` samples between peaks.
 */
export function detectBreathPeaks(
  samples: number[],
  minDistance: number = PEAK_MIN_DISTANCE_SAMPLES
): number {
  if (samples.length < 3) return 0;
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  let peaks = 0;
  let lastPeakIdx = -minDistance;
  for (let i = 1; i < samples.length - 1; i++) {
    // `>=` on the right handles plateau peaks (two equal samples
    // straddling the true crest); the min-distance check below keeps
    // each crest from being counted twice.
    const isLocalMax =
      samples[i] > samples[i - 1] &&
      samples[i] >= samples[i + 1] &&
      samples[i] > mean;
    if (isLocalMax && i - lastPeakIdx >= minDistance) {
      peaks++;
      lastPeakIdx = i;
    }
  }
  return peaks;
}

/**
 * Convert a peak count over a duration into breaths per minute.
 */
export function calculateBpm(
  peaks: number,
  durationSeconds: number
): number {
  if (durationSeconds <= 0) return 0;
  if (peaks < 0) return 0;
  return Math.round((peaks * 60) / durationSeconds);
}

/**
 * Compute BPM from raw 1-axis accelerometer samples taken over a known
 * duration. Returns null for invalid inputs (too few samples, bad
 * duration).
 */
export function calculateBreathingPhaseResult(
  samples: number[],
  durationSeconds: number
): BreathingPhaseResult | null {
  if (durationSeconds <= 0) return null;
  if (samples.length < SMOOTHING_WINDOW * 2) return null;
  const smoothed = smoothMovingAverage(samples);
  const peaks = detectBreathPeaks(smoothed);
  return {
    bpm: calculateBpm(peaks, durationSeconds),
    peaks_detected: peaks,
    duration_seconds: durationSeconds,
    samples_collected: samples.length,
  };
}

/**
 * Combine the two measurement phases and the user's prediction into
 * the final attempt result.
 */
export function calculateBreathingResult(
  restSamples: number[],
  restDurationSeconds: number,
  exerciseSamples: number[],
  exerciseDurationSeconds: number,
  restPredictionBpm: number
): BreathingResult | null {
  if (restPredictionBpm < 0) return null;
  const rest = calculateBreathingPhaseResult(restSamples, restDurationSeconds);
  const exercise = calculateBreathingPhaseResult(
    exerciseSamples,
    exerciseDurationSeconds
  );
  if (!rest || !exercise) return null;

  const rest_prediction_error = Math.abs(rest.bpm - restPredictionBpm);
  const rest_prediction_accuracy = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (1 - rest_prediction_error / MAX_PREDICTION_ERROR_BPM) * 100
      )
    )
  );

  const bpm_increase = exercise.bpm - rest.bpm;
  const bpm_increase_percent =
    rest.bpm > 0 ? Math.round((bpm_increase / rest.bpm) * 100) : 0;

  return {
    rest,
    exercise,
    rest_prediction_bpm: restPredictionBpm,
    rest_prediction_error,
    rest_prediction_accuracy,
    bpm_increase,
    bpm_increase_percent,
    completion_score: rest_prediction_accuracy,
  };
}
