// Renders the SoundPollution activity. ActivityShell is mocked to a
// passthrough and expo-audio is stubbed out so no real recorder is
// required.

import { render } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('expo-audio', () => ({
  useAudioRecorder: () => ({
    prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
    record: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
  }),
  useAudioRecorderState: () => ({ isRecording: false, metering: -160 }),
  AudioModule: {
    requestRecordingPermissionsAsync: jest.fn().mockResolvedValue({ granted: false }),
  },
  RecordingPresets: { HIGH_QUALITY: {} },
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
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
import SoundPollution from './SoundPollution';

describe('SoundPollution activity', () => {
  it('renders without crashing and shows its title', () => {
    const { getByText } = render(
      <ThemeProvider>
        <SoundPollution />
      </ThemeProvider>
    );

    expect(getByText('Sound Pollution Hunter')).toBeTruthy();
  });
});
