// Renders the welcome / index screen and asserts its title and the
// two CTA buttons.

import { render } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

import { ThemeProvider } from '../src/theme';
import Welcome from './index';

describe('Welcome (app/index.tsx)', () => {
  it('renders the title and both sign-in / sign-up buttons', () => {
    const { getAllByText, getByText } = render(
      <ThemeProvider>
        <Welcome />
      </ThemeProvider>
    );

    expect(getAllByText('STEMMLab').length).toBeGreaterThan(0);
    expect(getByText('Team Sign In')).toBeTruthy();
    expect(getByText('Team Sign Up')).toBeTruthy();
  });
});
