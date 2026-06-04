// =====================================================================
// Integration test — Team Sign In flow
//
// Exercises the real wiring between:
//   <TeamSignIn/>  →  teamRepository.findTeamByCredentials  →  zustand store
//
// The DB layer is stubbed with a stateful fake that returns a fixture
// team row + member rows, so the repository's two SELECTs run end-to-end
// and the screen actually consumes the result. Auth + router + haptics
// are mocked.
// =====================================================================

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { TextInput } from 'react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    dismissAll: jest.fn(),
  }),
}));

jest.mock('../lib/auth', () => ({
  ensureAnonymousAuth: jest.fn().mockResolvedValue('fb-uid-int-2'),
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

// Fixture team row that the SELECT against `teams` will return.
const FIXTURE_TEAM = {
  team_id: 42,
  team_name: 'Bravo Team',
  team_pin: '9876',
  grade_level: 7,
  discriminator: 'STEM-4242',
};
const FIXTURE_MEMBERS = [
  { team_id: 42, first_name: 'Riley' },
  { team_id: 42, first_name: 'Jordan' },
];

jest.mock('../database/database', () => {
  const calls: { sql: string; params: any[] }[] = [];
  return {
    __mockCalls: calls,
    getDatabase: jest.fn(async () => ({
      runAsync: jest.fn(),
      getFirstAsync: jest.fn(async (sql: string, params: any[] = []) => {
        calls.push({ sql, params });
        // findTeamByCredentials selects from teams by (team_name, team_pin).
        if (sql.includes('FROM teams')) {
          if (params[0] === 'Bravo Team' && params[1] === '9876') {
            return { ...FIXTURE_TEAM };
          }
          return null;
        }
        return null;
      }),
      getAllAsync: jest.fn(async (sql: string, params: any[] = []) => {
        calls.push({ sql, params });
        if (sql.includes('FROM team_members')) {
          return [...FIXTURE_MEMBERS];
        }
        return [];
      }),
    })),
  };
});

import { ensureAnonymousAuth } from '../lib/auth';
import { useTeamStore } from '../stores';
import { ThemeProvider } from '../theme';
import TeamSignIn from '../../app/team-sign-in';

const dbModule = require('../database/database') as {
  __mockCalls: { sql: string; params: any[] }[];
};

describe('Team Sign In integration', () => {
  beforeEach(() => {
    useTeamStore.getState().clearTeam();
    dbModule.__mockCalls.length = 0;
    (ensureAnonymousAuth as jest.Mock).mockClear();
  });

  it('looks up the team, hydrates members, and populates the store', async () => {
    const { UNSAFE_getAllByType, getByText } = render(
      <ThemeProvider>
        <TeamSignIn />
      </ThemeProvider>
    );

    // [0] Team name   [1] PIN
    const inputs = UNSAFE_getAllByType(TextInput);
    fireEvent.changeText(inputs[0], 'Bravo Team');
    fireEvent.changeText(inputs[1], '9876');

    fireEvent.press(getByText('Continue Team'));

    await waitFor(() => {
      expect(useTeamStore.getState().team).not.toBeNull();
    });

    const team = useTeamStore.getState().team!;
    expect(team.team_id).toBe('42'); // stringified in the store
    expect(team.team_name).toBe('Bravo Team');
    expect(team.grade_level).toBe(7);
    expect(team.discriminator).toBe('STEM-4242');
    expect(team.firebase_uid).toBe('fb-uid-int-2');
    expect(team.members).toEqual([
      { first_name: 'Riley' },
      { first_name: 'Jordan' },
    ]);

    // The repository should have run both queries — teams first, then
    // team_members for the matched team_id.
    const sqls = dbModule.__mockCalls.map((c) => c.sql);
    expect(sqls.some((s) => s.includes('FROM teams'))).toBe(true);
    expect(sqls.some((s) => s.includes('FROM team_members'))).toBe(true);

    expect(ensureAnonymousAuth).toHaveBeenCalledTimes(1);
  });

  it('leaves the store empty when the credentials do not match', async () => {
    const { UNSAFE_getAllByType, getByText } = render(
      <ThemeProvider>
        <TeamSignIn />
      </ThemeProvider>
    );

    const inputs = UNSAFE_getAllByType(TextInput);
    fireEvent.changeText(inputs[0], 'Ghost Team');
    fireEvent.changeText(inputs[1], '0000');

    fireEvent.press(getByText('Continue Team'));

    // The handler still calls the repo (which returns null) but should
    // not populate the store or run Firebase auth.
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    expect(useTeamStore.getState().team).toBeNull();
    expect(ensureAnonymousAuth).not.toHaveBeenCalled();
  });
});
