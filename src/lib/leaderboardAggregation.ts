// =====================================================================
// Pure functions for grouping and ranking leaderboard entries.
//
// Firestore stores one doc per (team, activity) thanks to best-wins
// semantics in sendToLeaderboard. These helpers turn that flat list
// into the two views the leaderboard screen needs:
//
//   - rankActivity(entries, activityId)
//       teams ranked by their best score for ONE activity
//   - computeTeamTotals(entries)
//       teams ranked by their SUM of best scores across ALL activities
//
// All functions are defensive against duplicates: if multiple entries
// share the same (team, activity) they collapse to the max score, so
// the math stays correct even if the upstream rules drift.
// =====================================================================

export interface RawLeaderboardEntry {
  discriminator: string;
  team_name: string;
  activity_id: string;
  score: number;
}

export interface ActivityRanking {
  rank: number;
  discriminator: string;
  team_name: string;
  score: number;
}

export interface TeamTotal {
  rank: number;
  discriminator: string;
  team_name: string;
  total: number;
  activities_completed: number;
}

/**
 * Collapse the entries to the best score per (team, activity). Used
 * as the foundation for both ranking views.
 */
export function bestPerTeamActivity(
  entries: RawLeaderboardEntry[]
): RawLeaderboardEntry[] {
  const bestByKey = new Map<string, RawLeaderboardEntry>();
  for (const e of entries) {
    const key = `${e.discriminator}_${e.activity_id}`;
    const existing = bestByKey.get(key);
    if (!existing || e.score > existing.score) {
      bestByKey.set(key, e);
    }
  }
  return Array.from(bestByKey.values());
}

/**
 * Rank teams by their best score for one specific activity.
 * Higher score → better rank. Ties keep original ordering.
 */
export function rankActivity(
  entries: RawLeaderboardEntry[],
  activityId: string
): ActivityRanking[] {
  const filtered = bestPerTeamActivity(entries).filter(
    (e) => e.activity_id === activityId
  );
  return filtered
    .slice()
    .sort((a, b) => b.score - a.score)
    .map((e, i) => ({
      rank: i + 1,
      discriminator: e.discriminator,
      team_name: e.team_name,
      score: e.score,
    }));
}

/**
 * Sum each team's best score across all activities, then rank teams by
 * that total. Teams that haven't completed every activity still appear
 * (with lower totals).
 */
export function computeTeamTotals(
  entries: RawLeaderboardEntry[]
): TeamTotal[] {
  const collapsed = bestPerTeamActivity(entries);

  const byTeam = new Map<
    string,
    { team_name: string; total: number; activities: Set<string> }
  >();
  for (const e of collapsed) {
    const existing = byTeam.get(e.discriminator);
    if (existing) {
      existing.total += e.score;
      existing.activities.add(e.activity_id);
      // Keep the most recently seen team name (handles team renames).
      existing.team_name = e.team_name;
    } else {
      byTeam.set(e.discriminator, {
        team_name: e.team_name,
        total: e.score,
        activities: new Set([e.activity_id]),
      });
    }
  }

  return Array.from(byTeam.entries())
    .map(([discriminator, info]) => ({
      discriminator,
      team_name: info.team_name,
      total: info.total,
      activities_completed: info.activities.size,
    }))
    .sort((a, b) => b.total - a.total)
    .map((row, i) => ({ rank: i + 1, ...row }));
}
