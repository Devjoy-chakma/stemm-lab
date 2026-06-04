// Unit tests for sendToLeaderboard — verifies best-score semantics,
// input validation, and the offline-queue fallback on Firestore error.

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db, _col, id) => ({ id })),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'SERVER_TS'),
  Timestamp: class {},
}));

jest.mock('./firebase', () => ({ db: { __fake: true } }));

jest.mock('../database/repositories/attemptRepository', () => ({
  queuePendingSync: jest.fn(),
}));

import { doc, getDoc, setDoc } from 'firebase/firestore';

import { queuePendingSync } from '../database/repositories/attemptRepository';
import { sendToLeaderboard } from './leaderboardSync';
import type { Attempt } from '../stores/useAttemptStore';
import type { Team } from '../stores/useTeamStore';

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
  attempt_id: 'a-1',
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

describe('sendToLeaderboard', () => {
  const mockGet = getDoc as jest.Mock;
  const mockSet = setDoc as jest.Mock;
  const mockDoc = doc as jest.Mock;
  const mockQueue = queuePendingSync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return expected data — writes a new entry when none exists', async () => {
    mockGet.mockResolvedValueOnce({ exists: () => false });
    mockSet.mockResolvedValueOnce(undefined);

    const result = await sendToLeaderboard(attempt, team);

    expect(result).toEqual({
      status: 'written',
      previousScore: null,
      newScore: 80,
    });
  });

  it('should handle missing input — rejects when score or finished_at is null', async () => {
    await expect(
      sendToLeaderboard({ ...attempt, score: null }, team)
    ).rejects.toThrow(/no score/);
    await expect(
      sendToLeaderboard({ ...attempt, finished_at: null }, team)
    ).rejects.toThrow(/not finished/);
  });

  it('should handle error response — queues the attempt when Firestore throws', async () => {
    mockGet.mockRejectedValueOnce(new Error('offline'));

    await expect(sendToLeaderboard(attempt, team)).rejects.toThrow('offline');
    expect(mockQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        discriminator: 'STEM-1234',
        team_name: 'Alpha',
        activity_id: 'parachute',
        score: 80,
        grade_level: 5,
        attempt_uid: 'a-1',
      })
    );
  });

  it('should call the correct Firebase function — deterministic doc id and write payload', async () => {
    mockGet.mockResolvedValueOnce({ exists: () => false });
    mockSet.mockResolvedValueOnce(undefined);

    await sendToLeaderboard(attempt, team);

    expect(mockDoc).toHaveBeenCalledWith(
      expect.anything(),
      'leaderboard_entries',
      'STEM-1234_parachute'
    );
    expect(mockSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        discriminator: 'STEM-1234',
        team_name: 'Alpha',
        activity_id: 'parachute',
        score: 80,
        year_level: 5,
        gps_lat: 1.1,
        gps_lng: 2.2,
        completed_at: 'SERVER_TS',
        attempt_id: 'a-1',
      })
    );
  });

  it('skips writes when an equal or higher score already exists', async () => {
    mockGet.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ score: 80 }),
    });
    const equal = await sendToLeaderboard(attempt, team);
    expect(equal.status).toBe('skipped_equal');

    mockGet.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ score: 99 }),
    });
    const lower = await sendToLeaderboard(attempt, team);
    expect(lower.status).toBe('skipped_lower');
    expect(mockSet).not.toHaveBeenCalled();
  });
});
