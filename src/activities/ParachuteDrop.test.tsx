// Renders the ParachuteDrop activity. ActivityShell and DropRecorder
// are mocked to passthroughs so we don't need expo-camera/expo-video.

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

jest.mock('../components/recorder/DropRecorder', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: () => React.createElement(View),
  };
});

import { ThemeProvider } from '../theme';
import ParachuteDrop from './ParachuteDrop';

describe('ParachuteDrop activity', () => {
  it('renders without crashing and shows its title', () => {
    const { getByText } = render(
      <ThemeProvider>
        <ParachuteDrop />
      </ThemeProvider>
    );

    expect(getByText('Parachute Drop')).toBeTruthy();
  });
});
