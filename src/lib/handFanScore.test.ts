import {
  calculateHandFanResult,
  findMaterial,
  MATERIALS,
  DISTANCES_CM,
} from './handFanScore';

describe('findMaterial', () => {
  it('returns the material when id matches', () => {
    expect(findMaterial('paper')?.id).toBe('paper');
    expect(findMaterial('cardboard')?.id).toBe('cardboard');
  });

  it('returns null for unknown id', () => {
    expect(findMaterial('plastic')).toBeNull();
  });
});

describe('MATERIALS catalog', () => {
  it('contains only paper and cardboard', () => {
    const ids = MATERIALS.map((m) => m.id);
    expect(ids).toEqual(['paper', 'cardboard']);
  });
});

describe('calculateHandFanResult', () => {
  it('returns null for an unknown material', () => {
    expect(calculateHandFanResult('plastic', 30, 30, 30)).toBeNull();
  });

  it('returns null for a negative prediction', () => {
    expect(calculateHandFanResult('paper', 30, -1, 30)).toBeNull();
  });

  it('returns null for a prediction beyond 180°', () => {
    expect(calculateHandFanResult('paper', 30, 200, 30)).toBeNull();
  });

  it('returns null for a negative outcome', () => {
    expect(calculateHandFanResult('paper', 30, 30, -1)).toBeNull();
  });

  it('returns null for an outcome beyond 180°', () => {
    expect(calculateHandFanResult('paper', 30, 30, 200)).toBeNull();
  });

  it('returns null for a non-positive distance', () => {
    expect(calculateHandFanResult('paper', 0, 30, 30)).toBeNull();
    expect(calculateHandFanResult('paper', -5, 30, 30)).toBeNull();
  });

  it('echoes the inputs in the result', () => {
    const result = calculateHandFanResult('cardboard', 30, 40, 55);
    expect(result?.material.id).toBe('cardboard');
    expect(result?.distance_cm).toBe(30);
    expect(result?.prediction_degrees).toBe(40);
    expect(result?.outcome_degrees).toBe(55);
  });

  it('scores 0 for a 0° bend', () => {
    const result = calculateHandFanResult('paper', 30, 0, 0);
    expect(result?.airflow_score).toBe(0);
  });

  it('scores 100 for a 90° (right-angle) bend', () => {
    const result = calculateHandFanResult('paper', 30, 90, 90);
    expect(result?.airflow_score).toBe(100);
  });

  it('scores 50 for a 45° bend', () => {
    const result = calculateHandFanResult('paper', 30, 45, 45);
    expect(result?.airflow_score).toBe(50);
  });

  it('clamps airflow_score to 100 for bends beyond 90°', () => {
    const result = calculateHandFanResult('paper', 30, 90, 150);
    expect(result?.airflow_score).toBe(100);
  });

  it('returns 100 prediction_accuracy for an exact prediction', () => {
    const result = calculateHandFanResult('paper', 30, 45, 45);
    expect(result?.prediction_error_degrees).toBe(0);
    expect(result?.prediction_accuracy).toBe(100);
  });

  it('returns lower prediction_accuracy the further off the prediction', () => {
    // Off by 30° → (1 - 30/90) * 100 = 66.67 → 67
    const result = calculateHandFanResult('paper', 30, 30, 60);
    expect(result?.prediction_error_degrees).toBe(30);
    expect(result?.prediction_accuracy).toBe(67);
  });

  it('returns 0 prediction_accuracy when off by 90° or more', () => {
    const off90 = calculateHandFanResult('paper', 30, 0, 90);
    expect(off90?.prediction_accuracy).toBe(0);

    const off120 = calculateHandFanResult('paper', 30, 0, 120);
    expect(off120?.prediction_accuracy).toBe(0);
  });

  it('treats over- and under-predictions symmetrically', () => {
    const over = calculateHandFanResult('paper', 30, 60, 30);
    const under = calculateHandFanResult('paper', 30, 30, 60);
    expect(over?.prediction_accuracy).toBe(under?.prediction_accuracy);
  });

  it('returns integer scores', () => {
    const result = calculateHandFanResult('paper', 30, 25, 32);
    expect(Number.isInteger(result?.airflow_score)).toBe(true);
    expect(Number.isInteger(result?.prediction_accuracy)).toBe(true);
  });

  it('accepts each canonical spec distance', () => {
    for (const d of DISTANCES_CM) {
      const result = calculateHandFanResult('paper', d, 30, 30);
      expect(result).not.toBeNull();
    }
  });
});
