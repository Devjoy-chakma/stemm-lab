// Renders the Settings screen with stubbed battery + pending-sync
// dependencies. Asserts the title and a few section headers.

import { render, waitFor } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock('../src/lib/battery', () => ({
  useBattery: () => ({ level: 0.8, charging: false }),
}));

jest.mock('../src/database/repositories/attemptRepository', () => ({
  countPendingSync: jest.fn().mockResolvedValue(0),
}));

jest.mock('../src/lib/backgroundSync', () => ({
  runPendingSyncNow: jest.fn().mockResolvedValue({
    attempted: 0,
    synced: 0,
    remaining: 0,
  }),
}));

import { ThemeProvider } from '../src/theme';
import Settings from './settings';

describe('Settings screen', () => {
  it('renders the title, Appearance/Device/Sync sections, and battery %', async () => {
    const { getByText } = render(
      <ThemeProvider>
        <Settings />
      </ThemeProvider>
    );

    expect(getByText('Settings')).toBeTruthy();
    expect(getByText('Appearance')).toBeTruthy();
    expect(getByText('Dark Mode')).toBeTruthy();
    expect(getByText('Device')).toBeTruthy();
    expect(getByText('Battery')).toBeTruthy();
    expect(getByText('Sync')).toBeTruthy();
    expect(getByText('STEMMLab v1.0')).toBeTruthy();

    await waitFor(() => {
      expect(getByText('80%')).toBeTruthy();
    });
  });
});
