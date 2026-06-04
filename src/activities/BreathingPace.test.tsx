// Renders the BreathingPace activity. ActivityShell is mocked to a
// passthrough so we just assert the activity mounts and the title and
// brief intro show up.

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
import BreathingPace from './BreathingPace';

describe('BreathingPace activity', () => {
  it('renders without crashing and shows its title', () => {
    const { getByText } = render(
      <ThemeProvider>
        <BreathingPace />
      </ThemeProvider>
    );

    expect(getByText('Breathing Pace Trainer')).toBeTruthy();
    // Brief copy comes from the activity itself, not the shell.
    expect(getByText("What you'll do")).toBeTruthy();
  });
});
