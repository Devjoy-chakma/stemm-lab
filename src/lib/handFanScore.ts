// =====================================================================
// Pure functions for the Hand Fan Challenge scoring (spec-aligned,
// REQUIRED activity only — the spec's "Optional Challenge" with F = k·θ
// and stiffness coefficients is intentionally skipped).
//
// Spec: students fan a vertical sheet (paper or cardboard) from a
// chosen distance, predict how much it will bend, then measure the
// actual bend. The score rewards how much the paper moved; the
// prediction accuracy gives the "were you right?" feedback.
// =====================================================================

export type HandFanMaterialId = 'paper' | 'cardboard';

export interface HandFanMaterial {
  id: HandFanMaterialId;
  label: string;
}

export const MATERIALS: HandFanMaterial[] = [
  { id: 'paper', label: 'Paper' },
  { id: 'cardboard', label: 'Cardboard' },
];

// Spec's three canonical fan-distance options.
export const DISTANCES_CM = [15, 30, 45] as const;
export type DistanceCm = (typeof DISTANCES_CM)[number];

// 90° is treated as "worst plausible prediction error" — bends past
// 90° clamp the score, so an error larger than 90° caps at 0 accuracy.
const MAX_PREDICTION_ERROR_DEGREES = 90;

export interface HandFanResult {
  material: HandFanMaterial;
  distance_cm: number;
  prediction_degrees: number;
  outcome_degrees: number;
  prediction_error_degrees: number;   // |outcome − prediction|
  prediction_accuracy: number;        // 0-100, 100 = exact prediction
  airflow_score: number;              // 0-100, scaled outcome (0-90° → 0-100)
}

export function findMaterial(id: string): HandFanMaterial | null {
  return MATERIALS.find((m) => m.id === id) ?? null;
}

/**
 * Compute the result for a single fan-design attempt.
 *
 * @param materialId - One of the MATERIALS ids
 * @param distanceCm - Fan distance from the paper, in centimeters (> 0)
 * @param predictionDegrees - The team's predicted bend angle (0-180)
 * @param outcomeDegrees - The observed bend angle (0-180)
 * @returns Result, or null if any input is invalid
 */
export function calculateHandFanResult(
  materialId: string,
  distanceCm: number,
  predictionDegrees: number,
  outcomeDegrees: number
): HandFanResult | null {
  if (predictionDegrees < 0 || predictionDegrees > 180) return null;
  if (outcomeDegrees < 0 || outcomeDegrees > 180) return null;
  if (distanceCm <= 0) return null;

  const material = findMaterial(materialId);
  if (!material) return null;

  const prediction_error_degrees = Math.abs(
    outcomeDegrees - predictionDegrees
  );
  const prediction_accuracy = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (1 - prediction_error_degrees / MAX_PREDICTION_ERROR_DEGREES) * 100
      )
    )
  );

  const airflow_score = Math.max(
    0,
    Math.min(100, Math.round((outcomeDegrees / 90) * 100))
  );

  return {
    material,
    distance_cm: distanceCm,
    prediction_degrees: predictionDegrees,
    outcome_degrees: outcomeDegrees,
    prediction_error_degrees,
    prediction_accuracy,
    airflow_score,
  };
}
