import {
  calculateBpm,
  calculateBreathingPhaseResult,
  calculateBreathingResult,
  detectBreathPeaks,
  smoothMovingAverage,
  ACCEL_SAMPLE_INTERVAL_MS,
} from './breathingScore';

/**
 * Build a synthetic sinusoidal accelerometer trace at the given BPM
 * for `durationSeconds` seconds, sampled every `ACCEL_SAMPLE_INTERVAL_MS`.
 */
function sineBreathing(
  bpm: number,
  durationSeconds: number,
  amplitude = 0.05,
  baseline = 1.0
): number[] {
  const samples: number[] = [];
  const sampleHz = 1000 / ACCEL_SAMPLE_INTERVAL_MS;
  const totalSamples = Math.round(durationSeconds * sampleHz);
  const breathHz = bpm / 60;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleHz;
    samples.push(baseline + amplitude * Math.sin(2 * Math.PI * breathHz * t));
  }
  return samples;
}

describe('smoothMovingAverage', () => {
  it('returns an empty array for empty input', () => {
    expect(smoothMovingAverage([])).toEqual([]);
  });

  it('preserves a constant signal', () => {
    expect(smoothMovingAverage([1, 1, 1, 1, 1], 3)).toEqual([1, 1, 1, 1, 1]);
  });

  it('smooths a noisy single spike toward neighbours', () => {
    const out = smoothMovingAverage([1, 1, 10, 1, 1], 3);
    // middle should be (1 + 10 + 1) / 3 = 4 (not 10)
    expect(out[2]).toBeCloseTo(4, 5);
  });

  it('returns the input when window <= 1', () => {
    expect(smoothMovingAverage([1, 2, 3], 1)).toEqual([1, 2, 3]);
  });
});

describe('detectBreathPeaks', () => {
  it('returns 0 for arrays shorter than 3', () => {
    expect(detectBreathPeaks([])).toBe(0);
    expect(detectBreathPeaks([1])).toBe(0);
    expect(detectBreathPeaks([1, 2])).toBe(0);
  });

  it('returns 0 for a flat signal', () => {
    const flat = new Array(50).fill(1);
    expect(detectBreathPeaks(flat)).toBe(0);
  });

  it('counts well-spaced peaks in a clean signal', () => {
    // 30-second sine wave at 12 BPM → 6 peaks expected
    const signal = sineBreathing(12, 30);
    expect(detectBreathPeaks(signal)).toBe(6);
  });

  it('enforces the minimum-distance rule between peaks', () => {
    // Two peaks too close together: should count as 1.
    const samples = [
      0, 0, 1, 0,   // peak at idx 2
      0, 0, 1, 0,   // peak at idx 6 — only 4 samples after the last
      0, 0, 0, 0,
    ];
    expect(detectBreathPeaks(samples, 10)).toBe(1);
  });
});

describe('calculateBpm', () => {
  it('returns 0 for zero duration', () => {
    expect(calculateBpm(5, 0)).toBe(0);
  });

  it('returns 0 for negative peaks', () => {
    expect(calculateBpm(-1, 30)).toBe(0);
  });

  it('computes BPM from peaks × 60 / duration', () => {
    // 6 peaks in 30 seconds = 12 BPM
    expect(calculateBpm(6, 30)).toBe(12);
  });

  it('rounds to an integer', () => {
    // 5 peaks in 22 seconds = 13.636… → 14
    expect(calculateBpm(5, 22)).toBe(14);
  });
});

describe('calculateBreathingPhaseResult', () => {
  it('returns null for non-positive duration', () => {
    expect(calculateBreathingPhaseResult([1, 1, 1, 1, 1, 1, 1, 1, 1, 1], 0)).toBeNull();
  });

  it('returns null when there are too few samples', () => {
    expect(calculateBreathingPhaseResult([1, 1, 1], 5)).toBeNull();
  });

  it('detects ~14 BPM from a synthetic 14-BPM trace', () => {
    const trace = sineBreathing(14, 30);
    const result = calculateBreathingPhaseResult(trace, 30);
    expect(result?.bpm).toBe(14);
  });

  it('detects ~24 BPM from a synthetic 24-BPM trace', () => {
    const trace = sineBreathing(24, 30);
    const result = calculateBreathingPhaseResult(trace, 30);
    expect(result?.bpm).toBe(24);
  });

  it('reports duration and samples_collected unchanged', () => {
    const trace = sineBreathing(12, 30);
    const result = calculateBreathingPhaseResult(trace, 30);
    expect(result?.duration_seconds).toBe(30);
    expect(result?.samples_collected).toBe(trace.length);
  });
});

describe('calculateBreathingResult', () => {
  const restTrace = sineBreathing(12, 20);
  const exerciseTrace = sineBreathing(24, 20);

  it('returns null for a negative prediction', () => {
    expect(
      calculateBreathingResult(restTrace, 20, exerciseTrace, 20, -1)
    ).toBeNull();
  });

  it('returns null when rest measurement is invalid', () => {
    expect(
      calculateBreathingResult([1, 1], 20, exerciseTrace, 20, 12)
    ).toBeNull();
  });

  it('returns null when exercise measurement is invalid', () => {
    expect(
      calculateBreathingResult(restTrace, 20, [1, 1], 20, 12)
    ).toBeNull();
  });

  it('exposes both phase results', () => {
    const result = calculateBreathingResult(restTrace, 20, exerciseTrace, 20, 12);
    expect(result?.rest.bpm).toBe(12);
    expect(result?.exercise.bpm).toBe(24);
  });

  it('computes bpm_increase and bpm_increase_percent', () => {
    const result = calculateBreathingResult(restTrace, 20, exerciseTrace, 20, 12);
    expect(result?.bpm_increase).toBe(12);
    expect(result?.bpm_increase_percent).toBe(100);
  });

  it('100 prediction_accuracy for an exact rest prediction', () => {
    const result = calculateBreathingResult(restTrace, 20, exerciseTrace, 20, 12);
    expect(result?.rest_prediction_error).toBe(0);
    expect(result?.rest_prediction_accuracy).toBe(100);
  });

  it('partial accuracy when prediction is off', () => {
    // Predict 7 when actual is 12 → off by 5 → (1 - 5/20)*100 = 75
    const result = calculateBreathingResult(restTrace, 20, exerciseTrace, 20, 7);
    expect(result?.rest_prediction_error).toBe(5);
    expect(result?.rest_prediction_accuracy).toBe(75);
  });

  it('0 accuracy when off by 20 BPM or more', () => {
    const result = calculateBreathingResult(restTrace, 20, exerciseTrace, 20, 40);
    expect(result?.rest_prediction_accuracy).toBe(0);
  });

  it('completion_score equals rest_prediction_accuracy', () => {
    const result = calculateBreathingResult(restTrace, 20, exerciseTrace, 20, 12);
    expect(result?.completion_score).toBe(result?.rest_prediction_accuracy);
  });

  it('bpm_increase_percent is 0 if rest.bpm is 0', () => {
    // Flat trace at the smoothing baseline produces 0 peaks → 0 BPM
    const flat = new Array(200).fill(1.0);
    const result = calculateBreathingResult(flat, 20, exerciseTrace, 20, 0);
    expect(result?.rest.bpm).toBe(0);
    expect(result?.bpm_increase_percent).toBe(0);
  });
});
