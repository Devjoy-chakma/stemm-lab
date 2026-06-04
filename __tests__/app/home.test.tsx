// Renders the Home screen and asserts the title plus a few activity
// tiles. Uses the real ThemeProvider; expo-router is mocked.

import { render } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));

import { ThemeProvider } from '../../src/theme';
import Home from '../../app/home';

describe('Home screen', () => {
  it('renders the title and activity tiles', () => {
    const { getByText } = render(
      <ThemeProvider>
        <Home />
      </ThemeProvider>
    );

    expect(getByText('STEMMLab')).toBeTruthy();
    expect(getByText('Parachute Drop')).toBeTruthy();
    expect(getByText('Sound Pollution')).toBeTruthy();
    expect(getByText('Hand Fan')).toBeTruthy();
    expect(getByText('Human Performance')).toBeTruthy();
    expect(getByText('Reaction Board')).toBeTruthy();
    expect(getByText('Breathing Pace')).toBeTruthy();
    expect(getByText('Leaderboard')).toBeTruthy();
    expect(getByText('Settings')).toBeTruthy();
  });
});
