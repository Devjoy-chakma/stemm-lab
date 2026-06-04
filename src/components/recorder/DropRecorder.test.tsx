// Renders the DropRecorder with expo-camera / expo-video / file-system
// stubbed out. Verifies the idle UI mounts without throwing.

import { render } from '@testing-library/react-native';

jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    CameraView: React.forwardRef((props: any, _ref: any) =>
      React.createElement(View, props, props.children)
    ),
    useCameraPermissions: () => [
      { granted: true, canAskAgain: true },
      jest.fn().mockResolvedValue({ granted: true }),
    ],
  };
});

jest.mock('expo-video', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    useVideoPlayer: () => ({ playbackRate: 1, loop: true, muted: true }),
    VideoView: (props: any) => React.createElement(View, props),
  };
});

jest.mock('expo-file-system/legacy', () => ({
  deleteAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../lib/mediaUpload', () => ({
  uploadVideo: jest.fn().mockResolvedValue('https://example/video.mov'),
  makeParachuteVideoPath: jest.fn(() => 'videos/parachute/x.mov'),
}));

import { ThemeProvider } from '../../theme';
import DropRecorder from './DropRecorder';

describe('DropRecorder', () => {
  it('renders the idle camera UI without crashing', () => {
    const { toJSON } = render(
      <ThemeProvider>
        <DropRecorder
          onConfirm={jest.fn()}
          onDiscard={jest.fn()}
          isReady
        />
      </ThemeProvider>
    );

    // Component should produce non-empty output.
    expect(toJSON()).toBeTruthy();
  });
});
