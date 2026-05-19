import { getDatabase } from "../database";
import type { Attempt } from "../../stores/useAttemptStore";

// Minimal display metadata so the activities FK on activity_attempts is
// satisfied even though the activities table is never seeded elsewhere.
const ACTIVITY_META: Record<
  string,
  { name: string; category: string; icon: string; sort_order: number }
> = {
  parachute: { name: "Parachute Drop", category: "engineering", icon: "🪂", sort_order: 1 },
  sound: { name: "Sound Pollution", category: "environment", icon: "🔊", sort_order: 2 },
  "hand-fan": { name: "Hand Fan", category: "physics", icon: "🪭", sort_order: 3 },
};

async function ensureActivityRow(
  db: Awaited<ReturnType<typeof getDatabase>>,
  activityId: string
) {
  const meta =
    ACTIVITY_META[activityId] ?? {
      name: activityId,
      category: "other",
      icon: "🧪",
      sort_order: 99,
    };

  await db.runAsync(
    `INSERT OR IGNORE INTO activities
       (activity_id, name, category, description, icon, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [activityId, meta.name, meta.category, "", meta.icon, meta.sort_order]
  );
}

/**
 * Persist a finished attempt (plus its score and write-up) to SQLite.
 *
 * Best-effort: the in-memory store remains the source of truth for the
 * live session, so any failure here is logged and swallowed rather than
 * crashing the activity. Persistence only runs when team_id is numeric
 * (i.e. a real teams row exists) — the 'demo-team' placeholder is skipped.
 */
export async function persistAttempt(attempt: Attempt): Promise<void> {
  const teamId = Number(attempt.team_id);
  if (!Number.isInteger(teamId)) {
    // No real team yet (e.g. the 'demo-team' fallback) — nothing to link to.
    return;
  }

  try {
    const db = await getDatabase();
    await ensureActivityRow(db, attempt.activity_id);

    const countRow = await db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM activity_attempts
       WHERE team_id = ? AND activity_id = ?`,
      [teamId, attempt.activity_id]
    );
    const attemptNumber = (countRow?.n ?? 0) + 1;

    const startedAt = new Date(attempt.started_at).toISOString();
    const completedAt =
      attempt.finished_at !== null
        ? new Date(attempt.finished_at).toISOString()
        : null;

    const result = await db.runAsync(
      `INSERT INTO activity_attempts
         (team_id, activity_id, attempt_number, started_at, completed_at, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        teamId,
        attempt.activity_id,
        attemptNumber,
        startedAt,
        completedAt,
        attempt.finished_at !== null ? "completed" : "in_progress",
      ]
    );

    const attemptId = result.lastInsertRowId;

    if (attempt.score !== null) {
      await db.runAsync(
        `INSERT INTO attempt_results
           (attempt_id, metric_name, metric_value, unit)
         VALUES (?, ?, ?, ?)`,
        [attemptId, "score", attempt.score, "points"]
      );
    }

    const reflection = attempt.write_up.trim();
    if (reflection.length > 0) {
      await db.runAsync(
        `INSERT INTO write_ups (attempt_id, reflection, created_at)
         VALUES (?, ?, ?)`,
        [attemptId, reflection, new Date().toISOString()]
      );
    }
  } catch (error) {
    console.error("Failed to persist attempt:", error);
  }
}
