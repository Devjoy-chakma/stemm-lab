// =====================================================================
// Pure functions for Parachute Drop scoring.
//
// Physics follows the user-spec kinematics for a toy dropped from rest
// with constant average acceleration over the fall:
//   h = ½ a t²            ⇒ a = 2h / t²
//   v_final = a · t       ⇒ v_final = 2h / t      (final velocity, NOT
//                                                  the time-average h/t)
//   F_drag  = m (g − a)
//
// Impact g-force (Step 6 of the spec) is the deceleration during the
// landing contact: g_impact = Δv / (Δt · g). It requires the user to
// measure contact time from a slow-mo replay, so it's optional —
// when no contact time is provided we return null for that field.
// =====================================================================

export const GRAVITY = 9.8; // m/s²
export const DEFAULT_TOY_MASS_KG = 0.2; // matches the spec's worked example

export interface ParachuteResult {
  avgTime: number;
  velocity: number;             // final velocity at impact (m/s)
  acceleration: number;         // average acceleration during fall (m/s²)
  dragForce: number;            // N (positive when the parachute is doing work)
  impactGForce: number | null;  // g-force on landing (null until contact time provided)
  dragScore: number;            // 0-100, how much the parachute slowed the fall
}

/**
 * Calculate all derived values for a parachute drop.
 *
 * @param heightMeters - Drop height in meters (must be > 0)
 * @param attemptTimes - Array of drop times in seconds (must have at least 1 entry, all > 0)
 * @param massKg - Toy mass in kg (must be > 0)
 * @param contactTimeSeconds - Optional contact time on landing in seconds. When
 *   omitted or non-positive, `impactGForce` is null.
 * @returns All computed metrics, or null if inputs are invalid
 */
export function calculateParachuteResult(
  heightMeters: number,
  attemptTimes: number[],
  massKg: number = DEFAULT_TOY_MASS_KG,
  contactTimeSeconds: number | null = null
): ParachuteResult | null {
  if (heightMeters <= 0) return null;
  if (attemptTimes.length === 0) return null;
  if (attemptTimes.some((t) => t <= 0)) return null;
  if (massKg <= 0) return null;

  const avgTime = attemptTimes.reduce((a, b) => a + b, 0) / attemptTimes.length;

  const acceleration = (2 * heightMeters) / (avgTime * avgTime);
  const velocity = (2 * heightMeters) / avgTime; // final velocity (v = a·t)

  const dragForce = massKg * (GRAVITY - acceleration);
  const dragScore = Math.max(
    0,
    Math.round((1 - acceleration / GRAVITY) * 100)
  );

  // Impact g-force per spec Step 6 — requires the user-measured contact
  // time. For "no bounce" the velocity change at impact is the full
  // downward velocity (going from v_final to 0).
  const impactGForce =
    contactTimeSeconds !== null && contactTimeSeconds > 0
      ? velocity / (contactTimeSeconds * GRAVITY)
      : null;

  return {
    avgTime,
    velocity,
    acceleration,
    dragForce,
    impactGForce,
    dragScore,
  };
}

/**
 * Calculate percentage improvement between two scores.
 *
 * @param currentScore - Current drag score
 * @param previousScore - Previous drag score
 * @returns Percentage improvement, or null if no comparison possible
 */
export function calculateImprovement(
  currentScore: number,
  previousScore: number | null
): number | null {
  if (previousScore === null || previousScore === 0) return null;
  return Math.round(((currentScore - previousScore) / previousScore) * 100);
}
