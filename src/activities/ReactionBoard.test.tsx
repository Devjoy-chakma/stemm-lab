// Renders the ReactionBoard activity. ActivityShell is mocked to a
// passthrough; we assert the title shows up.

import { render } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('../lib/location', () => ({
  getCurrentLocationOrNull: jest.fn().mockResolvedValue(null),
}));

jest.mock('../lib/notifications', () => ({
  notifyActivityScored: jest.fn(),
  ensureNotificationPermission: jest.fn().mockResolvedValue(true),
}));

jest.mock('../lib/leaderboardSync', () => ({
  sendToLeaderboard: jest.fn(),
}));

jest.mock('../components/ActivityShell', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  return {
    __esModule: true,
    default: ({ title, brief }: any) =>
      React.createElement(View, null, React.createElement(Text, null, title), brief),
  };
});

import { ThemeProvider } from '../theme';
import ReactionBoard from './ReactionBoard';

describe('ReactionBoard activity', () => {
  it('renders without crashing and shows its title', () => {
    const { getByText } = render(
      <ThemeProvider>
        <ReactionBoard />
      </ThemeProvider>
    );

    expect(getByText('Reaction Board')).toBeTruthy();
  });
});
