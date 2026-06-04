// Unit tests for the attempt repository — covers persistAttempt and the
// pending_sync queue helpers (queue / list / count / remove / leaderboard).

jest.mock('../database', () => ({
  getDatabase: jest.fn(),
}));

import { getDatabase } from '../database';
import {
  countPendingSync,
  getLeaderboard,
  listPendingSync,
  persistAttempt,
  queuePendingSync,
  removePendingSync,
} from './attemptRepository';
import type { Attempt } from '../../stores/useAttemptStore';

const mockGetDb = getDatabase as jest.Mock;

function makeDb(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 99 }),
    getFirstAsync: jest.fn().mockResolvedValue({ n: 0 }),
    getAllAsync: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

const attempt: Attempt = {
  attempt_id: 'a-1',
  team_id: '7',
  activity_id: 'parachute',
  started_at: Date.UTC(2024, 0, 1),
  finished_at: Date.UTC(2024, 0, 1, 0, 0, 5),
  score: 42,
  gps_lat: 1.1,
  gps_lng: 2.2,
  raw_data: {},
  write_up: '  great drop  ',
};

describe('persistAttempt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore?.();
  });

  it('should return expected data — inserts attempt, result and write-up rows', async () => {
    const db = makeDb();
    mockGetDb.mockResolvedValueOnce(db);

    await persistAttempt(attempt);

    const sqls = db.runAsync.mock.calls.map((c: any[]) => String(c[0]));
    expect(sqls.some((s) => s.includes('INSERT INTO activity_attempts'))).toBe(
      true
    );
    expect(sqls.some((s) => s.includes('INSERT INTO attempt_results'))).toBe(
      true
    );
    expect(sqls.some((s) => s.includes('INSERT INTO write_ups'))).toBe(true);
  });

  it('should handle missing input — skips persistence for non-numeric team_id', async () => {
    await persistAttempt({ ...attempt, team_id: 'demo-team' });
    expect(mockGetDb).not.toHaveBeenCalled();
  });

  it('should handle error response — swallows database failures', async () => {
    mockGetDb.mockRejectedValueOnce(new Error('db unavailable'));

    await expect(persistAttempt(attempt)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });

  it('should call the correct database function — increments attempt_number per (team, activity)', async () => {
    const db = makeDb({
      getFirstAsync: jest.fn().mockResolvedValueOnce({ n: 2 }),
    });
    mockGetDb.mockResolvedValueOnce(db);

    await persistAttempt(attempt);

    const attemptInsert = db.runAsync.mock.calls.find((c: any[]) =>
      String(c[0]).includes('INSERT INTO activity_attempts')
    );
    expect(attemptInsert![1][2]).toBe(3); // attempt_number = count + 1
  });
});

describe('pending_sync queue helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore?.();
  });

  it('queuePendingSync inserts the row with the provided fields', async () => {
    const db = makeDb();
    mockGetDb.mockResolvedValueOnce(db);

    await queuePendingSync({
      discriminator: 'STEM-1234',
      team_name: 'Alpha',
      activity_id: 'parachute',
      score: 80,
      grade_level: 5,
      gps_lat: 1,
      gps_lng: 2,
      attempt_uid: 'a-1',
    });

    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO pending_sync'),
      expect.arrayContaining(['STEM-1234', 'Alpha', 'parachute', 80])
    );
  });

  it('listPendingSync returns the rows from the database', async () => {
    const rows = [{ pending_id: 1 }, { pending_id: 2 }];
    const db = makeDb({
      getAllAsync: jest.fn().mockResolvedValueOnce(rows),
    });
    mockGetDb.mockResolvedValueOnce(db);

    await expect(listPendingSync()).resolves.toEqual(rows);
  });

  it('listPendingSync handles error response — returns empty array', async () => {
    mockGetDb.mockRejectedValueOnce(new Error('db gone'));

    await expect(listPendingSync()).resolves.toEqual([]);
  });

  it('countPendingSync returns the COUNT(*) value, or zero on error', async () => {
    const db = makeDb({
      getFirstAsync: jest.fn().mockResolvedValueOnce({ n: 5 }),
    });
    mockGetDb.mockResolvedValueOnce(db);
    await expect(countPendingSync()).resolves.toBe(5);

    mockGetDb.mockRejectedValueOnce(new Error('x'));
    await expect(countPendingSync()).resolves.toBe(0);
  });

  it('removePendingSync deletes by pending_id', async () => {
    const db = makeDb();
    mockGetDb.mockResolvedValueOnce(db);

    await removePendingSync(42);

    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM pending_sync WHERE pending_id'),
      [42]
    );
  });
});

describe('getLeaderboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call the correct database function — joins teams and attempt_results', async () => {
    const rows = [{ team_name: 'Alpha', score: 90 }];
    const db = makeDb({
      getAllAsync: jest.fn().mockResolvedValueOnce(rows),
    });
    mockGetDb.mockResolvedValueOnce(db);

    await expect(getLeaderboard()).resolves.toEqual(rows);
    const sql = String(db.getAllAsync.mock.calls[0][0]);
    expect(sql).toContain('FROM activity_attempts');
    expect(sql).toContain('JOIN teams');
    expect(sql).toContain('attempt_results');
    expect(sql).toContain('ORDER BY ar.metric_value DESC');
  });
});
