// Renders the HumanPerformance activity. ActivityShell is mocked to a
// passthrough; we assert the title shows up.

import { render } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('expo-sensors', () => ({
  Accelerometer: {
    setUpdateInterval: jest.fn(),
    addListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  },
  Gyroscope: {
    setUpdateInterval: jest.fn(),
    addListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  },
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
import HumanPerformance from './HumanPerformance';

describe('HumanPerformance activity', () => {
  it('renders without crashing and shows its title', () => {
    const { getByText } = render(
      <ThemeProvider>
        <HumanPerformance />
      </ThemeProvider>
    );

    expect(getByText('Human Performance Lab')).toBeTruthy();
  });
});
