// Unit tests for runMigrations — verifies base CREATE TABLE statements

jest.mock('./database', () => ({
  getDatabase: jest.fn(),
}));

jest.mock('./schema', () => ({
  CREATE_USERS_TABLE: 'CREATE_USERS_TABLE',
  CREATE_TEAMS_TABLE: 'CREATE_TEAMS_TABLE',
  CREATE_TEAM_MEMBERS_TABLE: 'CREATE_TEAM_MEMBERS_TABLE',
  CREATE_ACTIVITIES_TABLE: 'CREATE_ACTIVITIES_TABLE',
  CREATE_ACTIVITY_ATTEMPTS_TABLE: 'CREATE_ACTIVITY_ATTEMPTS_TABLE',
  CREATE_ATTEMPT_RESULTS_TABLE: 'CREATE_ATTEMPT_RESULTS_TABLE',
  CREATE_WRITEUPS_TABLE: 'CREATE_WRITEUPS_TABLE',
  CREATE_MEDIA_FILES_TABLE: 'CREATE_MEDIA_FILES_TABLE',
  CREATE_APP_SETTINGS_TABLE: 'CREATE_APP_SETTINGS_TABLE',
  CREATE_META_TABLE: 'CREATE_META_TABLE',
  CREATE_PENDING_SYNC_TABLE: 'CREATE_PENDING_SYNC_TABLE',
}));

import { getDatabase } from './database';
import { runMigrations } from './migrations';

const mockGetDb = getDatabase as jest.Mock;

function makeFakeDb(currentVersion: number | null) {
  return {
    execAsync: jest.fn().mockResolvedValue(undefined),
    runAsync: jest.fn().mockResolvedValue(undefined),
    getFirstAsync: jest
      .fn()
      .mockResolvedValue(
        currentVersion === null ? undefined : { schema_version: currentVersion }
      ),
  };
}

describe('runMigrations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    (console.log as jest.Mock).mockRestore?.();
    (console.error as jest.Mock).mockRestore?.();
  });

  it('should return expected data — records SCHEMA_VERSION on success', async () => {
    const db = makeFakeDb(4);
    mockGetDb.mockResolvedValueOnce(db);

    await runMigrations();

    const inserted = db.runAsync.mock.calls.find((c: any[]) =>
      String(c[0]).startsWith('INSERT INTO _meta')
    );
    expect(inserted).toBeTruthy();
    expect(inserted![1]).toEqual([4]);
  });

  it('should handle missing input — treats absent _meta as v1 and runs every pending migration', async () => {
    const db = makeFakeDb(null);
    mockGetDb.mockResolvedValueOnce(db);

    await runMigrations();

    const execSQL = db.execAsync.mock.calls.map((c: any[]) => c[0]);
    expect(execSQL).toEqual(
      expect.arrayContaining([
        'CREATE_USERS_TABLE',
        'CREATE_TEAMS_TABLE',
        'CREATE_PENDING_SYNC_TABLE',
        // v1→v2 migration:
        expect.stringContaining('ALTER TABLE teams ADD COLUMN team_pin'),
        // v2→v3 migrations:
        expect.stringContaining('gps_lat'),
        expect.stringContaining('gps_lng'),
      ])
    );
  });

  it('should handle error response — swallows getDatabase failure', async () => {
    mockGetDb.mockRejectedValueOnce(new Error('db broken'));

    await expect(runMigrations()).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });

  it('should call the correct database function — exec for DDL, runAsync for _meta', async () => {
    const db = makeFakeDb(4);
    mockGetDb.mockResolvedValueOnce(db);

    await runMigrations();

    expect(db.execAsync).toHaveBeenCalledWith('CREATE_PENDING_SYNC_TABLE');
    expect(db.runAsync).toHaveBeenCalledWith('DELETE FROM _meta');
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO _meta'),
      [4]
    );
  });

  it('skips migrations when already at the latest version', async () => {
    const db = makeFakeDb(4);
    mockGetDb.mockResolvedValueOnce(db);

    await runMigrations();

    const ranAlter = db.execAsync.mock.calls.some((c: any[]) =>
      String(c[0]).includes('ALTER TABLE')
    );
    expect(ranAlter).toBe(false);
  });
});
