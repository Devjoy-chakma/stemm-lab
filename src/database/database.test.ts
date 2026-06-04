// Unit tests for getDatabase — verifies the open call, singleton reuse,
// and that PRAGMA foreign_keys is set on first open.

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

import * as SQLite from 'expo-sqlite';

const loadModule = () => {
  let mod!: typeof import('./database');
  jest.isolateModules(() => {
    mod = require('./database');
  });
  return mod;
};

describe('getDatabase', () => {
  const mockOpen = SQLite.openDatabaseAsync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return expected data — opens the stemm-lab.db database', async () => {
    const fakeDb = { execAsync: jest.fn().mockResolvedValue(undefined) };
    mockOpen.mockResolvedValueOnce(fakeDb);

    const { getDatabase } = loadModule();
    const db = await getDatabase();

    expect(db).toBe(fakeDb);
    expect(mockOpen).toHaveBeenCalledWith('stemm-lab.db');
  });

  it('should handle missing input — singleton: opens only once across calls', async () => {
    const fakeDb = { execAsync: jest.fn().mockResolvedValue(undefined) };
    mockOpen.mockResolvedValueOnce(fakeDb);

    const { getDatabase } = loadModule();
    const a = await getDatabase();
    const b = await getDatabase();

    expect(a).toBe(b);
    expect(mockOpen).toHaveBeenCalledTimes(1);
  });

  it('should handle error response — propagates open failures', async () => {
    mockOpen.mockRejectedValueOnce(new Error('no fs'));

    const { getDatabase } = loadModule();

    await expect(getDatabase()).rejects.toThrow('no fs');
  });

  it('should call the correct database function — enables foreign keys', async () => {
    const exec = jest.fn().mockResolvedValue(undefined);
    mockOpen.mockResolvedValueOnce({ execAsync: exec });

    const { getDatabase } = loadModule();
    await getDatabase();

    expect(exec).toHaveBeenCalledWith('PRAGMA foreign_keys = ON;');
  });
});
