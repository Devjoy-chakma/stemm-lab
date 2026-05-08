import {
  dbfsToNoiseLevel,
  categorizeNoiseLevel,
  calculateSoundPollutionResult,
  SoundSample,
} from './soundPollutionScore';

// ---------------------------------------------------------------------------
// dbfsToNoiseLevel
// ---------------------------------------------------------------------------

describe('dbfsToNoiseLevel', () => {
  it('returns 0 for silence (-60 dBFS or quieter)', () => {
    expect(dbfsToNoiseLevel(-60)).toBe(0);
    expect(dbfsToNoiseLevel(-100)).toBe(0);
    expect(dbfsToNoiseLevel(-160)).toBe(0);
  });

  it('returns 100 for digital max (0 dBFS or louder)', () => {
    expect(dbfsToNoiseLevel(0)).toBe(100);
    expect(dbfsToNoiseLevel(5)).toBe(100);
  });

  it('maps -30 dBFS to 50 (midpoint of the scale)', () => {
    expect(dbfsToNoiseLevel(-30)).toBe(50);
  });

  it('maps -45 dBFS to 25 (quarter point)', () => {
    expect(dbfsToNoiseLevel(-45)).toBe(25);
  });

  it('maps -15 dBFS to 75 (three-quarter point)', () => {
    expect(dbfsToNoiseLevel(-15)).toBe(75);
  });

  it('rounds to the nearest integer', () => {
    // -32 dBFS = (28/60)*100 = 46.67 → 47
    expect(dbfsToNoiseLevel(-32)).toBe(47);
  });
});

// ---------------------------------------------------------------------------
// categorizeNoiseLevel
// ---------------------------------------------------------------------------

describe('categorizeNoiseLevel', () => {
  it('categorizes 0-24 as quiet', () => {
    expect(categorizeNoiseLevel(0)).toBe('quiet');
    expect(categorizeNoiseLevel(24)).toBe('quiet');
  });

  it('categorizes 25-49 as moderate', () => {
    expect(categorizeNoiseLevel(25)).toBe('moderate');
    expect(categorizeNoiseLevel(49)).toBe('moderate');
  });

  it('categorizes 50-74 as loud', () => {
    expect(categorizeNoiseLevel(50)).toBe('loud');
    expect(categorizeNoiseLevel(74)).toBe('loud');
  });

  it('categorizes 75-100 as very_loud', () => {
    expect(categorizeNoiseLevel(75)).toBe('very_loud');
    expect(categorizeNoiseLevel(100)).toBe('very_loud');
  });
});

// ---------------------------------------------------------------------------
// calculateSoundPollutionResult
// ---------------------------------------------------------------------------

describe('calculateSoundPollutionResult', () => {
  const makeSample = (
    average_db: number,
    peak_db: number = average_db + 5,
  ): SoundSample => ({
    average_db,
    peak_db,
    duration_seconds: 10,
  });

  it('returns null for an empty samples array', () => {
    expect(calculateSoundPollutionResult([])).toBeNull();
  });

  it('handles a single sample correctly', () => {
    const result = calculateSoundPollutionResult([makeSample(-30, -20)]);
    expect(result).not.toBeNull();
    expect(result!.overall_average_db).toBe(-30);
    expect(result!.overall_peak_db).toBe(-20);
    expect(result!.noise_level).toBe(50);
    expect(result!.pollution_score).toBe(50);
  });

  it('averages dBFS across multiple samples', () => {
    const result = calculateSoundPollutionResult([
      makeSample(-40),
      makeSample(-30),
      makeSample(-20),
    ]);
    expect(result!.overall_average_db).toBe(-30); // (-40 + -30 + -20) / 3
  });

  it('takes the maximum peak across samples', () => {
    const result = calculateSoundPollutionResult([
      makeSample(-40, -25),
      makeSample(-30, -10),
      makeSample(-20, -15),
    ]);
    expect(result!.overall_peak_db).toBe(-10);
  });

  it('inverts noise level into pollution score (quieter = higher score)', () => {
    const quiet = calculateSoundPollutionResult([makeSample(-50)]);
    const loud = calculateSoundPollutionResult([makeSample(-10)]);
    expect(quiet!.pollution_score).toBeGreaterThan(loud!.pollution_score);
  });

  it('gives perfect silence a pollution score of 100', () => {
    const result = calculateSoundPollutionResult([makeSample(-60)]);
    expect(result!.pollution_score).toBe(100);
    expect(result!.category).toBe('quiet');
  });

  it('gives maximum noise a pollution score of 0', () => {
    const result = calculateSoundPollutionResult([makeSample(0)]);
    expect(result!.pollution_score).toBe(0);
    expect(result!.category).toBe('very_loud');
  });

  it('preserves the original samples in the result', () => {
    const samples = [makeSample(-30), makeSample(-20)];
    const result = calculateSoundPollutionResult(samples);
    expect(result!.samples).toHaveLength(2);
    expect(result!.samples).toEqual(samples);
  });

  it('clamps noise_level and pollution_score within [0, 100]', () => {
    const result = calculateSoundPollutionResult([makeSample(-30)]);
    expect(result!.noise_level).toBeGreaterThanOrEqual(0);
    expect(result!.noise_level).toBeLessThanOrEqual(100);
    expect(result!.pollution_score).toBeGreaterThanOrEqual(0);
    expect(result!.pollution_score).toBeLessThanOrEqual(100);
  });

  it('produces a category that matches the noise level', () => {
    const result = calculateSoundPollutionResult([makeSample(-45)]); // → 25 = moderate
    expect(result!.noise_level).toBe(25);
    expect(result!.category).toBe('moderate');
  });
});