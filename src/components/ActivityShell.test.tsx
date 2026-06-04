// Renders ActivityShell with simple children for each tab and asserts
// the title + the initial Brief tab content show up.

import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));

import { ThemeProvider } from '../theme';
import ActivityShell from './ActivityShell';

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider>{ui}</ThemeProvider>);

describe('ActivityShell', () => {
  it('renders the title, the tab labels, and the active Brief child', () => {
    const { getByText } = renderWithTheme(
      <ActivityShell
        activity_id="parachute"
        title="Parachute Drop"
        brief={<Text>Brief content</Text>}
        run={<Text>Run content</Text>}
        results={<Text>Results content</Text>}
        writeUp={<Text>Write-up content</Text>}
      />
    );

    expect(getByText('Parachute Drop')).toBeTruthy();
    expect(getByText('Brief')).toBeTruthy();
    expect(getByText('Run')).toBeTruthy();
    expect(getByText('Results')).toBeTruthy();
    expect(getByText('Write-up')).toBeTruthy();
    // Initial tab is Brief, so its content should be on screen.
    expect(getByText('Brief content')).toBeTruthy();
  });
});
