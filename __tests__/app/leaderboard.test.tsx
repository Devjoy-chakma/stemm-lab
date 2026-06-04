// Renders the Leaderboard screen. Firestore + SQLite are mocked so the
// render in the initial loading state.

import { render } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(() => () => undefined),
}));

jest.mock('../../src/lib/firebase', () => ({ db: { __fake: true } }));

jest.mock('../../src/database/repositories/attemptRepository', () => ({
  getLeaderboard: jest.fn().mockResolvedValue([]),
}));

import { ThemeProvider } from '../../src/theme';
import Leaderboard from '../../app/leaderboard';

describe('Leaderboard screen', () => {
  it('renders the title and subtitle', () => {
    const { getByText } = render(
      <ThemeProvider>
        <Leaderboard />
      </ThemeProvider>
    );

    expect(getByText('Leaderboard')).toBeTruthy();
    expect(getByText('Top STEMMLab performers')).toBeTruthy();
    // Tabs from TABS array:
    expect(getByText('Overall')).toBeTruthy();
    expect(getByText('Parachute')).toBeTruthy();
  });
});
