// =====================================================================
// Integration test — offline send + queue + background drain
//
// The full happy-then-recover path:
//   1. App is offline → sendToLeaderboard() throws, but the attempt is
//      written to the local `pending_sync` queue.
//   2. Connectivity comes back → runPendingSyncNow() drains the queue,
//      writes to Firestore, and removes the row.
//
// Real code under test:
//   - lib/leaderboardSync.sendToLeaderboard
//   - lib/backgroundSync.runPendingSyncNow + trySyncOne (module-local)
//   - database/repositories/attemptRepository (queue helpers)
//
// Mocked at the boundary:
//   - firebase/firestore — toggleable between "throwing" and "working"
//   - database/database — stateful in-memory pending_sync table
// =====================================================================

import type { Attempt } from '../stores/useAttemptStore';
import type { Team } from '../stores/useTeamStore';

// --- Firestore mock ---------------------------------------------------
// `mockFirestoreState` is referenced inside jest.mock factories below;
// the `mock` prefix is required by Jest's hoisting rules.
const mockFirestoreState = {
  /** When true, getDoc throws an "offline" error. */
  offline: true,
  /** Captures every successful setDoc payload. */
  writes: [] as { id: string; payload: any }[],
  /** Pre-existing leaderboard entries keyed by doc id. */
  store: new Map<string, any>(),
};

// backgroundSync.ts pulls in expo-background-fetch + expo-task-manager
// at module load. Neither module has a native implementation in node,
// so we stub them out before importing the module under test.
jest.mock('expo-background-fetch', () => ({
  BackgroundFetchStatus: { Restricted: 1, Denied: 2, Available: 3 },
  BackgroundFetchResult: { NoData: 1, NewData: 2, Failed: 3 },
  getStatusAsync: jest.fn().mockResolvedValue(3),
  registerTaskAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-task-manager', () => ({
  isTaskDefined: jest.fn().mockReturnValue(true),
  defineTask: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db, _col, id) => ({ id })),
  serverTimestamp: jest.fn(() => 'SERVER_TS'),
  Timestamp: class {},
  getDoc: jest.fn(async (ref: { id: string }) => {
    if (mockFirestoreState.offline) {
      throw new Error('network unavailable');
    }
    const data = mockFirestoreState.store.get(ref.id);
    return {
      exists: () => data !== undefined,
      data: () => data,
    };
  }),
  setDoc: jest.fn(async (ref: { id: string }, payload: any) => {
    if (mockFirestoreState.offline) {
      throw new Error('network unavailable');
    }
    mockFirestoreState.writes.push({ id: ref.id, payload });
    mockFirestoreState.store.set(ref.id, payload);
  }),
}));

jest.mock('../lib/firebase', () => ({ db: { __fake: true } }));

// --- SQLite mock — stateful single-table store -----------------------
// Models just the `pending_sync` table well enough for the queue
// helpers to exercise queue / list / count / remove against it.
const mockSqliteState = {
  rows: [] as any[],
  nextId: 1,
};

jest.mock('../database/database', () => ({
  getDatabase: jest.fn(async () => ({
    runAsync: jest.fn(async (sql: string, params: any[] = []) => {
      if (sql.includes('INSERT INTO pending_sync')) {
        const row = {
          pending_id: mockSqliteState.nextId++,
          discriminator: params[0],
          team_name: params[1],
          activity_id: params[2],
          score: params[3],
          grade_level: params[4],
          gps_lat: params[5],
          gps_lng: params[6],
          attempt_uid: params[7],
          queued_at: params[8],
        };
        mockSqliteState.rows.push(row);
        return { lastInsertRowId: row.pending_id };
      }
      if (sql.includes('DELETE FROM pending_sync')) {
        const id = params[0];
        mockSqliteState.rows = mockSqliteState.rows.filter(
          (r) => r.pending_id !== id
        );
        return {};
      }
      return {};
    }),
    getAllAsync: jest.fn(async (sql: string) => {
      if (sql.includes('FROM pending_sync')) {
        return [...mockSqliteState.rows].sort(
          (a, b) => a.pending_id - b.pending_id
        );
      }
      return [];
    }),
    getFirstAsync: jest.fn(async (sql: string) => {
      if (sql.includes('COUNT(*)') && sql.includes('pending_sync')) {
        return { n: mockSqliteState.rows.length };
      }
      return null;
    }),
  })),
}));

// --- Real code under test --------------------------------------------
import { runPendingSyncNow } from '../lib/backgroundSync';
import { sendToLeaderboard } from '../lib/leaderboardSync';
import {
  countPendingSync,
  listPendingSync,
} from '../database/repositories/attemptRepository';

const team: Team = {
  team_id: '7',
  team_name: 'Alpha',
  grade_level: 5,
  discriminator: 'STEM-1234',
  firebase_uid: 'fb-uid',
  members: [],
  created_at: 1700000000000,
};

const attempt: Attempt = {
  attempt_id: 'att-int-1',
  team_id: '7',
  activity_id: 'parachute',
  started_at: 1700000000000,
  finished_at: 1700000010000,
  score: 80,
  gps_lat: 1.1,
  gps_lng: 2.2,
  raw_data: {},
  write_up: '',
};

describe('Offline send → queue → background drain', () => {
  beforeEach(() => {
    mockFirestoreState.offline = true;
    mockFirestoreState.writes.length = 0;
    mockFirestoreState.store.clear();
    mockSqliteState.rows.length = 0;
    mockSqliteState.nextId = 1;
  });

  it('queues the attempt when Firestore is offline, then drains it once back online', async () => {
    // ----- Step 1: offline send -----
    await expect(sendToLeaderboard(attempt, team)).rejects.toThrow(
      'network unavailable'
    );

    // The queue should now contain exactly the failed attempt.
    expect(await countPendingSync()).toBe(1);
    const queued = await listPendingSync();
    expect(queued).toHaveLength(1);
    expect(queued[0]).toEqual(
      expect.objectContaining({
        discriminator: 'STEM-1234',
        team_name: 'Alpha',
        activity_id: 'parachute',
        score: 80,
        grade_level: 5,
        attempt_uid: 'att-int-1',
      })
    );
    expect(mockFirestoreState.writes).toHaveLength(0);

    // ----- Step 2: connectivity returns; background task drains -----
    mockFirestoreState.offline = false;

    const result = await runPendingSyncNow();

    expect(result).toEqual({ attempted: 1, synced: 1, remaining: 0 });
    expect(await countPendingSync()).toBe(0);

    // Firestore received exactly the queued attempt, at the right doc id,
    // with the queue's score and activity preserved.
    expect(mockFirestoreState.writes).toHaveLength(1);
    expect(mockFirestoreState.writes[0].id).toBe('STEM-1234_parachute');
    expect(mockFirestoreState.writes[0].payload).toEqual(
      expect.objectContaining({
        discriminator: 'STEM-1234',
        team_name: 'Alpha',
        activity_id: 'parachute',
        score: 80,
        year_level: 5,
        attempt_id: 'att-int-1',
      })
    );
  });

  it('drops queued rows during drain when Firestore already has a higher score', async () => {
    // Queue the attempt while offline…
    await expect(sendToLeaderboard(attempt, team)).rejects.toThrow();
    expect(await countPendingSync()).toBe(1);

    // …then come online, but with a higher score already recorded.
    mockFirestoreState.offline = false;
    mockFirestoreState.store.set('STEM-1234_parachute', { score: 95 });

    const result = await runPendingSyncNow();

    // The queued row is considered superseded — no new write, queue empties.
    expect(result).toEqual({ attempted: 1, synced: 1, remaining: 0 });
    expect(mockFirestoreState.writes).toHaveLength(0);
    expect(await countPendingSync()).toBe(0);
  });
});
