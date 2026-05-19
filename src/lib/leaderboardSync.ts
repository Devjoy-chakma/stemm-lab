import type { Attempt } from '../stores/useAttemptStore';
import type { Team } from '../stores/useTeamStore';

export interface LeaderboardEntry {
  discriminator: string;
  activity_id: string;
  score: number;
  year_level: number;
  school_code: string;
  completed_at: number;
}

/**
 * Sends a leaderboard entry to Firestore.
 *
 * SCRUM-31 will replace this stub with a real Firestore write.
 * Returns a promise so the UI can show loading + success/error states now.
 */
export async function sendToLeaderboard(
  attempt: Attempt,
  team: Team
): Promise<LeaderboardEntry> {
  if (attempt.score === null) {
    throw new Error('Attempt has no score yet — cannot send to leaderboard');
  }
  if (attempt.finished_at === null) {
    throw new Error('Attempt is not finished yet — cannot send to leaderboard');
  }

  const entry: LeaderboardEntry = {
    discriminator: team.discriminator,
    activity_id: attempt.activity_id,
    score: attempt.score,
    year_level: team.grade_level,
    school_code: team.event_code ?? '',
    completed_at: attempt.finished_at,
  };

  // SCRUM-31: replace this with a real Firestore write
  //   const ref = doc(db, 'leaderboard_entries', `${entry.discriminator}_${entry.activity_id}`);
  //   await setDoc(ref, entry);
  console.log('[leaderboardSync stub] Would send:', entry);

  // Simulate network latency so the UI shows a real loading state
  await new Promise((resolve) => setTimeout(resolve, 800));

  return entry;
}