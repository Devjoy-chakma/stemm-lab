// Renders the Map screen. react-native-maps + Firestore + expo-location
// are mocked; we assert the header text shows up.

import { render, waitFor } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn((_q, onNext) => {
    // Fire an empty snapshot immediately so the screen leaves loading state.
    onNext({ docs: [] });
    return () => undefined;
  }),
}));

jest.mock('../../src/lib/firebase', () => ({ db: { __fake: true } }));

jest.mock('../../src/lib/location', () => ({
  getCurrentLocationOrNull: jest.fn().mockResolvedValue(null),
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const passthrough = ({ children }: any) => React.createElement(View, null, children);
  return {
    __esModule: true,
    default: passthrough,
    Marker: passthrough,
    Callout: passthrough,
    PROVIDER_DEFAULT: 'default',
  };
});

import { ThemeProvider } from '../../src/theme';
import MapScreen from '../../app/map';

describe('Map screen', () => {
  it('renders the Map view header and the empty state once the snapshot resolves', async () => {
    const { getByText } = render(
      <ThemeProvider>
        <MapScreen />
      </ThemeProvider>
    );

    expect(getByText('Map view')).toBeTruthy();
    await waitFor(() => {
      expect(getByText('0 attempts with GPS')).toBeTruthy();
    });
  });
});
