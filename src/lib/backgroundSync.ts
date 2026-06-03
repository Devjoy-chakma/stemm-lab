// =====================================================================
// Background sync task — drains the `pending_sync` SQLite queue by
// retrying each entry against Firestore.
//
// Two ways to invoke:
//   - Periodic background fetch via expo-background-fetch (registered
//     once at app startup; iOS / Android decide when to actually run
//     it, typically every 15+ minutes when conditions allow).
//   - On-demand via runPendingSyncNow() from a "Sync now" UI button.
//
// Both paths funnel through the same drain function so behaviour is
// identical regardless of how it was kicked off.
// =====================================================================

import * as BackgroundFetch from 'expo-background-fetch';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import * as TaskManager from 'expo-task-manager';

import {
  listPendingSync,
  PendingSyncRow,
  removePendingSync,
} from '../database/repositories/attemptRepository';
import { db } from './firebase';
import { LEADERBOARD_COLLECTION } from './leaderboardSync';

export const PENDING_SYNC_TASK = 'stemmlab.pendingSync';

export interface DrainResult {
  attempted: number;   // how many queue rows we tried
  synced: number;      // how many made it to Firestore (or were superseded)
  remaining: number;   // queue rows still pending at the end
}

/**
 * Attempt to write a single queue row to Firestore. On success (write
 * or skip — older/equal score doesn't need overwriting), the queue row
 * is removed. Network/Firestore errors leave it for the next attempt.
 */
async function trySyncOne(row: PendingSyncRow): Promise<boolean> {
  const docId = `${row.discriminator}_${row.activity_id}`;
  const ref = doc(db, LEADERBOARD_COLLECTION, docId);
  try {
    const existingSnap = await getDoc(ref);
    const previousScore = existingSnap.exists()
      ? ((existingSnap.data()?.score ?? null) as number | null)
      : null;

    // Best-wins: if a higher (or equal) score is already there, our
    // queued entry is obsolete — drop it from the queue.
    if (previousScore !== null && row.score <= previousScore) {
      await removePendingSync(row.pending_id);
      return true;
    }

    await setDoc(ref, {
      discriminator: row.discriminator,
      team_name: row.team_name,
      activity_id: row.activity_id,
      score: row.score,
      year_level: row.grade_level,
      gps_lat: row.gps_lat,
      gps_lng: row.gps_lng,
      completed_at: serverTimestamp(),
      attempt_id: row.attempt_uid,
    });

    await removePendingSync(row.pending_id);
    return true;
  } catch (e) {
    // Leave the row in the queue for a future retry.
    return false;
  }
}

/**
 * Drain the queue. Used by both the periodic task and the manual
 * "Sync now" button.
 */
export async function runPendingSyncNow(): Promise<DrainResult> {
  const rows = await listPendingSync();
  let synced = 0;
  for (const row of rows) {
    const ok = await trySyncOne(row);
    if (ok) synced++;
  }
  return {
    attempted: rows.length,
    synced,
    remaining: rows.length - synced,
  };
}

// Define the background task once at module load. expo-task-manager
// keeps the registry in native memory; redefining is a no-op.
if (!TaskManager.isTaskDefined(PENDING_SYNC_TASK)) {
  TaskManager.defineTask(PENDING_SYNC_TASK, async () => {
    try {
      const { synced } = await runPendingSyncNow();
      return synced > 0
        ? BackgroundFetch.BackgroundFetchResult.NewData
        : BackgroundFetch.BackgroundFetchResult.NoData;
    } catch {
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

/**
 * Register the periodic background task. Safe to call multiple times.
 * Should run once at app startup.
 */
export async function registerBackgroundSyncTask(): Promise<void> {
  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
        status === BackgroundFetch.BackgroundFetchStatus.Denied) {
      // OS won't let us run — silently ignore. Manual sync still works.
      return;
    }
    await BackgroundFetch.registerTaskAsync(PENDING_SYNC_TASK, {
      minimumInterval: 15 * 60, // 15 minutes — the iOS / Android floor
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (e) {
    console.warn('Failed to register background sync task:', e);
  }
}
