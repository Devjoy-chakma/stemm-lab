import {
  calculateBreathingResult,
  categorizeFocus,
  CYCLE_DURATION_SECONDS,
} from './breathingScore';

describe('categorizeFocus', () => {
  it('labels exactly 100 as Excellent', () => {
    expect(categorizeFocus(100)).toBe('Excellent');
  });

  it('labels values above 100 as Excellent (defensive)', () => {
    expect(categorizeFocus(125)).toBe('Excellent');
  });

  it('labels 99 as Good', () => {
    expect(categorizeFocus(99)).toBe('Good');
  });

  it('labels exactly 75 as Good', () => {
    expect(categorizeFocus(75)).toBe('Good');
  });

  it('labels 74 as Fair', () => {
    expect(categorizeFocus(74)).toBe('Fair');
  });

  it('labels exactly 50 as Fair', () => {
    expect(categorizeFocus(50)).toBe('Fair');
  });

  it('labels 49 as Incomplete', () => {
    expect(categorizeFocus(49)).toBe('Incomplete');
  });

  it('labels 0 as Incomplete', () => {
    expect(categorizeFocus(0)).toBe('Incomplete');
  });
});

describe('calculateBreathingResult', () => {
  it('returns null for zero target duration', () => {
    expect(calculateBreathingResult(10, 0)).toBeNull();
  });

  it('returns null for negative target duration', () => {
    expect(calculateBreathingResult(10, -5)).toBeNull();
  });

  it('returns null for negative completed duration', () => {
    expect(calculateBreathingResult(-1, 15)).toBeNull();
  });

  it('a fully completed 15s session scores 100 Excellent', () => {
    const result = calculateBreathingResult(15, 15);
    expect(result?.completion_percent).toBe(100);
    expect(result?.completion_score).toBe(100);
    expect(result?.focus_level).toBe('Excellent');
  });

  it('half a 15s session scores 50 Fair', () => {
    const result = calculateBreathingResult(7.5, 15);
    expect(result?.completion_percent).toBe(50);
    expect(result?.focus_level).toBe('Fair');
  });

  it('three-quarters of a 15s session scores 75 Good', () => {
    const result = calculateBreathingResult(11.25, 15);
    expect(result?.completion_percent).toBe(75);
    expect(result?.focus_level).toBe('Good');
  });

  it('a zero-duration session scores 0 Incomplete', () => {
    const result = calculateBreathingResult(0, 15);
    expect(result?.completion_percent).toBe(0);
    expect(result?.focus_level).toBe('Incomplete');
  });

  it('clamps duration that exceeds the target', () => {
    const result = calculateBreathingResult(30, 15);
    expect(result?.duration_completed_seconds).toBe(15);
    expect(result?.completion_percent).toBe(100);
  });

  it('reports target_duration_seconds unchanged', () => {
    const result = calculateBreathingResult(5, 15);
    expect(result?.target_duration_seconds).toBe(15);
  });

  it('counts approximately 2 breathing cycles in a 15s session', () => {
    // 15 / 8 = 1.875 → rounds to 2
    const result = calculateBreathingResult(15, 15);
    expect(result?.breathing_cycles).toBe(2);
  });

  it('counts exactly 1 cycle in a single CYCLE_DURATION_SECONDS', () => {
    const result = calculateBreathingResult(
      CYCLE_DURATION_SECONDS,
      CYCLE_DURATION_SECONDS
    );
    expect(result?.breathing_cycles).toBe(1);
  });

  it('counts 0 cycles for a zero-length session', () => {
    const result = calculateBreathingResult(0, 15);
    expect(result?.breathing_cycles).toBe(0);
  });

  it('returns an integer completion_score', () => {
    const result = calculateBreathingResult(10, 15);
    // 10/15 = 0.666… → 67 (rounded)
    expect(result?.completion_score).toBe(67);
    expect(Number.isInteger(result?.completion_score)).toBe(true);
  });
});
