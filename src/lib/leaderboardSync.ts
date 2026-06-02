import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';

import type { Attempt } from '../stores/useAttemptStore';
import type { Team } from '../stores/useTeamStore';
import { db } from './firebase';

export const LEADERBOARD_COLLECTION = 'leaderboard_entries';

/**
 * Shape of a leaderboard document as STORED in Firestore.
 * Note `completed_at` is a Timestamp when read back, but a FieldValue
 * sentinel (serverTimestamp()) at write time.
 */
export interface LeaderboardEntry {
  discriminator: string;
  team_name: string;
  activity_id: string;
  score: number;
  year_level: number;
  gps_lat: number | null;
  gps_lng: number | null;
  completed_at: Timestamp | null;
  attempt_id: string;
}

/**
 * Outcome of a sendToLeaderboard call.
 *
 *   written        – the doc was created or upgraded with a higher score
 *   skipped_lower  – existing doc has a higher score; nothing written
 *   skipped_equal  – existing doc has the same score; nothing written
 */
export interface SendResult {
  status: 'written' | 'skipped_lower' | 'skipped_equal';
  previousScore: number | null;
  newScore: number;
}

/**
 * Write the team's score for an activity to Firestore, keeping
 * best-score-wins semantics: one doc per (team, activity), and writes
 * only overwrite if the new score is strictly higher than the existing.
 *
 * Doc id is `${discriminator}_${activity_id}` so reads/updates are
 * deterministic without needing a query.
 */
export async function sendToLeaderboard(
  attempt: Attempt,
  team: Team
): Promise<SendResult> {
  if (attempt.score === null) {
    throw new Error('Attempt has no score yet — cannot send to leaderboard');
  }
  if (attempt.finished_at === null) {
    throw new Error('Attempt is not finished yet — cannot send to leaderboard');
  }

  const docId = `${team.discriminator}_${attempt.activity_id}`;
  const ref = doc(db, LEADERBOARD_COLLECTION, docId);

  const existingSnap = await getDoc(ref);
  const previousScore = existingSnap.exists()
    ? ((existingSnap.data()?.score ?? null) as number | null)
    : null;

  if (previousScore !== null) {
    if (attempt.score < previousScore) {
      return { status: 'skipped_lower', previousScore, newScore: attempt.score };
    }
    if (attempt.score === previousScore) {
      return { status: 'skipped_equal', previousScore, newScore: attempt.score };
    }
  }

  await setDoc(ref, {
    discriminator: team.discriminator,
    team_name: team.team_name,
    activity_id: attempt.activity_id,
    score: attempt.score,
    year_level: team.grade_level,
    gps_lat: attempt.gps_lat,
    gps_lng: attempt.gps_lng,
    completed_at: serverTimestamp(),
    attempt_id: attempt.attempt_id,
  });

  return { status: 'written', previousScore, newScore: attempt.score };
}
