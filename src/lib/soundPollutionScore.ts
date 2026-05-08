// =====================================================================
// Pure functions for Sound Pollution Hunter scoring.
//
// Sound pressure level conventions:
// - expo-audio meters audio in dBFS (decibels Full Scale).
//   Range: -160 dB (silence) to 0 dB (digital max).
// - We convert to a friendly 0-100 "noise" scale where:
//     0   = silence
//     50  = normal conversation
//     100 = very loud
// =====================================================================

export interface SoundSample {
  peak_db: number;        // peak dBFS during sample (e.g., -12)
  average_db: number;     // average dBFS during sample (e.g., -32)
  duration_seconds: number;
}

export interface SoundPollutionResult {
  samples: SoundSample[];
  overall_peak_db: number;
  overall_average_db: number;
  noise_level: number;          // 0-100 friendly scale
  pollution_score: number;      // 0-100, higher = quieter (better)
  category: 'quiet' | 'moderate' | 'loud' | 'very_loud';
}

/**
 * Convert a dBFS value (-160 to 0) to a friendly 0-100 noise level.
 * -60 dBFS or quieter → 0
 * 0 dBFS → 100
 */
export function dbfsToNoiseLevel(dbfs: number): number {
  if (dbfs <= -60) return 0;
  if (dbfs >= 0) return 100;
  // Linear scale: -60..0 → 0..100
  return Math.round(((dbfs + 60) / 60) * 100);
}

/**
 * Categorize noise level into qualitative buckets.
 */
export function categorizeNoiseLevel(noiseLevel: number): SoundPollutionResult['category'] {
  if (noiseLevel < 25) return 'quiet';
  if (noiseLevel < 50) return 'moderate';
  if (noiseLevel < 75) return 'loud';
  return 'very_loud';
}

/**
 * Compute the full result from a list of samples.
 */
export function calculateSoundPollutionResult(
  samples: SoundSample[]
): SoundPollutionResult | null {
  if (samples.length === 0) return null;

  const overall_peak_db = Math.max(...samples.map((s) => s.peak_db));
  const overall_average_db =
    samples.reduce((sum, s) => sum + s.average_db, 0) / samples.length;

  const noise_level = dbfsToNoiseLevel(overall_average_db);
  // Pollution score: inverted noise level. Quieter = better = higher score.
  const pollution_score = 100 - noise_level;
  const category = categorizeNoiseLevel(noise_level);

  return {
    samples,
    overall_peak_db,
    overall_average_db,
    noise_level,
    pollution_score,
    category,
  };
}