// Unit tests for the background sync drain — verifies that queued rows
// are sent to Firestore, removed on success, left in the queue on
jest.mock('expo-background-fetch', () => ({
  BackgroundFetchStatus: { Restricted: 1, Denied: 2, Available: 3 },
  BackgroundFetchResult: { NoData: 1, NewData: 2, Failed: 3 },
  getStatusAsync: jest.fn(),
  registerTaskAsync: jest.fn(),
}));

jest.mock('expo-task-manager', () => ({
  isTaskDefined: jest.fn().mockReturnValue(true),
  defineTask: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db, _col, id) => ({ id })),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'SERVER_TS'),
}));

jest.mock('./firebase', () => ({ db: { __fake: true } }));

jest.mock('../database/repositories/attemptRepository', () => ({
  listPendingSync: jest.fn(),
  removePendingSync: jest.fn(),
}));

import * as BackgroundFetch from 'expo-background-fetch';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import {
  listPendingSync,
  removePendingSync,
} from '../database/repositories/attemptRepository';
import {
  registerBackgroundSyncTask,
  runPendingSyncNow,
} from './backgroundSync';

const mockList = listPendingSync as jest.Mock;
const mockRemove = removePendingSync as jest.Mock;
const mockGetDoc = getDoc as jest.Mock;
const mockSetDoc = setDoc as jest.Mock;
const mockDoc = doc as jest.Mock;
const mockGetStatus = BackgroundFetch.getStatusAsync as jest.Mock;
const mockRegister = BackgroundFetch.registerTaskAsync as jest.Mock;

const baseRow = {
  pending_id: 1,
  discriminator: 'STEM-1234',
  team_name: 'Alpha',
  activity_id: 'parachute',
  score: 90,
  grade_level: 5,
  gps_lat: 1.1,
  gps_lng: 2.2,
  attempt_uid: 'a-1',
  queued_at: '2024-01-01T00:00:00.000Z',
};

describe('runPendingSyncNow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return expected data — syncs and removes rows when Firestore accepts', async () => {
    mockList.mockResolvedValueOnce([baseRow]);
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });
    mockSetDoc.mockResolvedValueOnce(undefined);

    const result = await runPendingSyncNow();

    expect(result).toEqual({ attempted: 1, synced: 1, remaining: 0 });
    expect(mockRemove).toHaveBeenCalledWith(1);
  });

  it('should handle missing input — empty queue returns zero counts', async () => {
    mockList.mockResolvedValueOnce([]);

    const result = await runPendingSyncNow();

    expect(result).toEqual({ attempted: 0, synced: 0, remaining: 0 });
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('should handle error response — leaves rows queued when setDoc throws', async () => {
    mockList.mockResolvedValueOnce([baseRow]);
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });
    mockSetDoc.mockRejectedValueOnce(new Error('offline'));

    const result = await runPendingSyncNow();

    expect(result).toEqual({ attempted: 1, synced: 0, remaining: 1 });
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('should call the correct Firebase function — doc id and setDoc payload', async () => {
    mockList.mockResolvedValueOnce([baseRow]);
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });
    mockSetDoc.mockResolvedValueOnce(undefined);

    await runPendingSyncNow();

    expect(mockDoc).toHaveBeenCalledWith(
      expect.anything(),
      'leaderboard_entries',
      'STEM-1234_parachute'
    );
    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        discriminator: 'STEM-1234',
        score: 90,
        year_level: 5,
        attempt_id: 'a-1',
        completed_at: 'SERVER_TS',
      })
    );
  });

  it('skips rows whose Firestore entry already has a higher-or-equal score', async () => {
    mockList.mockResolvedValueOnce([baseRow]);
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ score: 100 }),
    });

    const result = await runPendingSyncNow();

    expect(mockSetDoc).not.toHaveBeenCalled();
    expect(mockRemove).toHaveBeenCalledWith(1);
    expect(result.synced).toBe(1);
  });
});

describe('registerBackgroundSyncTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    (console.warn as jest.Mock).mockRestore?.();
  });

  it('should call the correct BackgroundFetch function when status is available', async () => {
    mockGetStatus.mockResolvedValueOnce(
      BackgroundFetch.BackgroundFetchStatus.Available
    );

    await registerBackgroundSyncTask();

    expect(mockRegister).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        minimumInterval: 15 * 60,
        stopOnTerminate: false,
        startOnBoot: true,
      })
    );
  });

  it('should handle missing input — does not register when OS denies', async () => {
    mockGetStatus.mockResolvedValueOnce(
      BackgroundFetch.BackgroundFetchStatus.Denied
    );

    await registerBackgroundSyncTask();

    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('should handle error response — swallows getStatus rejection', async () => {
    mockGetStatus.mockRejectedValueOnce(new Error('boom'));

    await expect(registerBackgroundSyncTask()).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalled();
  });
});
