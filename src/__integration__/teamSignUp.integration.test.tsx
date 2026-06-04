// =====================================================================
// Integration test — Team Sign Up flow
//
// Exercises the real wiring between:
//   <TeamSignUp/>  →  teamRepository.createTeamSession  →  zustand store
//   <TeamSignUp/>  →  ensureAnonymousAuth (mocked at the firebase layer)
//
// Only the lowest layers are mocked: SQLite (via the database module),
// Firebase auth, expo-router, and haptics. Everything else — the
// screen, the form state, the repository, the zustand store — runs for
// real, so this catches wiring/regression bugs the unit tests can't.
// =====================================================================

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { TextInput } from 'react-native';

// --- Mocks (factories must be self-contained — Jest hoists them) -----

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    dismissAll: jest.fn(),
  }),
}));

jest.mock('../lib/auth', () => ({
  ensureAnonymousAuth: jest.fn().mockResolvedValue('fb-uid-int-1'),
}));

jest.mock('../lib/haptics', () => ({
  haptic: {
    light: jest.fn(),
    medium: jest.fn(),
    heavy: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    selection: jest.fn(),
  },
}));

// Stateful in-memory SQLite fake — tracks every INSERT so we can assert
// on what the repository wrote.
jest.mock('../database/database', () => {
  const calls: { sql: string; params: any[] }[] = [];
  let nextId = 100;
  return {
    __mockCalls: calls,
    getDatabase: jest.fn(async () => ({
      runAsync: jest.fn(async (sql: string, params: any[] = []) => {
        calls.push({ sql, params });
        return { lastInsertRowId: nextId++ };
      }),
      getFirstAsync: jest.fn(async () => null),
      getAllAsync: jest.fn(async () => []),
    })),
  };
});

import { ensureAnonymousAuth } from '../lib/auth';
import { useTeamStore } from '../stores';
import { ThemeProvider } from '../theme';
import TeamSignUp from '../../app/team-sign-up';

// Pull the call log out of the mock so we can assert on it.
const dbModule = require('../database/database') as {
  __mockCalls: { sql: string; params: any[] }[];
};

describe('Team Sign Up integration', () => {
  beforeEach(() => {
    // Reset the zustand singleton between tests.
    useTeamStore.getState().clearTeam();
    dbModule.__mockCalls.length = 0;
    (ensureAnonymousAuth as jest.Mock).mockClear();
  });

  it('writes the team to SQLite, sets the zustand store, and links to Firebase auth', async () => {
    const { UNSAFE_getAllByType, getByText } = render(
      <ThemeProvider>
        <TeamSignUp />
      </ThemeProvider>
    );

    // The screen has 5 TextInputs in document order:
    //   [0] Team name   [1] Grade   [2] Member 1   [3] Member 2   [4] PIN
    const inputs = UNSAFE_getAllByType(TextInput);
    fireEvent.changeText(inputs[0], 'Alpha Squad');
    fireEvent.changeText(inputs[1], '5');
    fireEvent.changeText(inputs[2], 'Sam');
    fireEvent.changeText(inputs[3], 'Pat');
    fireEvent.changeText(inputs[4], '1234');

    fireEvent.press(getByText('Create Team'));

    // The submit handler is async (awaits the repo + auth). Wait for
    // the team store to be populated — that's our integration signal.
    await waitFor(() => {
      expect(useTeamStore.getState().team).not.toBeNull();
    });

    const team = useTeamStore.getState().team!;
    expect(team.team_name).toBe('Alpha Squad');
    expect(team.grade_level).toBe(5);
    expect(team.firebase_uid).toBe('fb-uid-int-1');
    expect(team.members).toEqual([{ first_name: 'Sam' }, { first_name: 'Pat' }]);
    expect(team.discriminator).toMatch(/^STEM-\d{4}$/);

    // The repository should have made these SQL calls — verify the chain
    // (users seed → teams insert → 2× team_members inserts) actually ran
    // against the database layer.
    const sqls = dbModule.__mockCalls.map((c) => c.sql);
    expect(sqls.some((s) => s.includes('INSERT OR IGNORE INTO users'))).toBe(true);
    expect(sqls.some((s) => s.includes('INSERT INTO teams'))).toBe(true);
    const memberInserts = dbModule.__mockCalls.filter((c) =>
      c.sql.includes('INSERT INTO team_members')
    );
    expect(memberInserts).toHaveLength(2);
    expect(memberInserts[0].params[1]).toBe('Sam');
    expect(memberInserts[1].params[1]).toBe('Pat');

    // Firebase Anonymous Auth was called exactly once.
    expect(ensureAnonymousAuth).toHaveBeenCalledTimes(1);
  });

  it('blocks submission and leaves the store empty when the PIN is invalid', async () => {
    const { UNSAFE_getAllByType, getByText } = render(
      <ThemeProvider>
        <TeamSignUp />
      </ThemeProvider>
    );

    const inputs = UNSAFE_getAllByType(TextInput);
    fireEvent.changeText(inputs[0], 'Alpha Squad');
    fireEvent.changeText(inputs[1], '5');
    fireEvent.changeText(inputs[2], 'Sam');
    fireEvent.changeText(inputs[3], 'Pat');
    fireEvent.changeText(inputs[4], '12'); // too short

    fireEvent.press(getByText('Create Team'));

    // Validation should reject before any DB call or auth happens.
    // Give microtasks a chance to run, then assert nothing happened.
    await new Promise((r) => setImmediate(r));

    expect(useTeamStore.getState().team).toBeNull();
    expect(dbModule.__mockCalls).toHaveLength(0);
    expect(ensureAnonymousAuth).not.toHaveBeenCalled();
  });
});
