// Unit tests for the team repository — covers createTeamSession's
// inserts (user + team + members) and findTeamByCredentials's lookup.

jest.mock('../database', () => ({
  getDatabase: jest.fn(),
}));

import { getDatabase } from '../database';
import {
  createTeamSession,
  findTeamByCredentials,
} from './teamRepository';

const mockGetDb = getDatabase as jest.Mock;

function makeDb(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 17 }),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    getAllAsync: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe('createTeamSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return expected data — teamId and STEM-#### discriminator', async () => {
    const db = makeDb();
    mockGetDb.mockResolvedValueOnce(db);

    const result = await createTeamSession({
      userId: 1,
      teamName: 'Alpha',
      gradeLevel: 5,
      teamPin: '1234',
      memberNames: ['Sam', 'Pat'],
    });

    expect(result.teamId).toBe(17);
    expect(result.discriminator).toMatch(/^STEM-\d{4}$/);
  });

  it('should handle missing input — empty / whitespace member names are skipped', async () => {
    const db = makeDb();
    mockGetDb.mockResolvedValueOnce(db);

    await createTeamSession({
      userId: 1,
      teamName: 'Alpha',
      gradeLevel: 3,
      teamPin: '0000',
      memberNames: ['Sam', '   ', ''],
    });

    const memberInserts = db.runAsync.mock.calls.filter((c: any[]) =>
      String(c[0]).includes('INSERT INTO team_members')
    );
    expect(memberInserts).toHaveLength(1);
    expect(memberInserts[0][1][1]).toBe('Sam');
  });

  it('should handle error response — propagates database failures', async () => {
    mockGetDb.mockRejectedValueOnce(new Error('locked'));

    await expect(
      createTeamSession({
        userId: 1,
        teamName: 'Alpha',
        gradeLevel: 5,
        teamPin: '1234',
        memberNames: [],
      })
    ).rejects.toThrow('locked');
  });

  it('should call the correct database function — seeds users, inserts team, adds members', async () => {
    const db = makeDb();
    mockGetDb.mockResolvedValueOnce(db);

    await createTeamSession({
      userId: 1,
      teamName: '  Beta  ',
      gradeLevel: 7,
      teamPin: '9999',
      memberNames: ['Lee'],
    });

    const sqls = db.runAsync.mock.calls.map((c: any[]) => String(c[0]));
    expect(sqls.some((s) => s.includes('INSERT OR IGNORE INTO users'))).toBe(
      true
    );
    expect(sqls.some((s) => s.includes('INSERT INTO teams'))).toBe(true);
    expect(sqls.some((s) => s.includes('INSERT INTO team_members'))).toBe(true);

    const teamInsert = db.runAsync.mock.calls.find((c: any[]) =>
      String(c[0]).includes('INSERT INTO teams')
    );
    // team_name should be trimmed; pin and grade level passed through.
    expect(teamInsert![1][1]).toBe('Beta');
    expect(teamInsert![1][3]).toBe(7);
    expect(teamInsert![1][4]).toBe('9999');
  });
});

describe('findTeamByCredentials', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return expected data — team plus its members', async () => {
    const team = { team_id: 5, team_name: 'Alpha', team_pin: '1234' };
    const members = [{ first_name: 'Sam' }];
    const db = makeDb({
      getFirstAsync: jest.fn().mockResolvedValueOnce(team),
      getAllAsync: jest.fn().mockResolvedValueOnce(members),
    });
    mockGetDb.mockResolvedValueOnce(db);

    const result = await findTeamByCredentials('Alpha', '1234');

    expect(result).toEqual({ ...team, members });
  });

  it('should handle missing input — returns null when no team matches', async () => {
    const db = makeDb({
      getFirstAsync: jest.fn().mockResolvedValueOnce(null),
    });
    mockGetDb.mockResolvedValueOnce(db);

    await expect(
      findTeamByCredentials('Ghost', '0000')
    ).resolves.toBeNull();
  });

  it('should handle error response — propagates database failures', async () => {
    mockGetDb.mockRejectedValueOnce(new Error('boom'));

    await expect(
      findTeamByCredentials('Alpha', '1234')
    ).rejects.toThrow('boom');
  });

  it('should call the correct database function — trims team_name in lookup', async () => {
    const db = makeDb({
      getFirstAsync: jest.fn().mockResolvedValueOnce({ team_id: 1 }),
    });
    mockGetDb.mockResolvedValueOnce(db);

    await findTeamByCredentials('  Alpha  ', '1234');

    expect(db.getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining('FROM teams'),
      ['Alpha', '1234']
    );
  });
});
