// Renders the Team Sign In screen and asserts the team-name + PIN
// fields and the primary CTA. (This codebase uses team name + 4-digit

import { render } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), dismissAll: jest.fn() }),
}));

jest.mock('../src/database/repositories/teamRepository', () => ({
  findTeamByCredentials: jest.fn(),
}));

jest.mock('../src/lib/auth', () => ({
  ensureAnonymousAuth: jest.fn().mockResolvedValue(null),
}));

import { ThemeProvider } from '../src/theme';
import TeamSignIn from './team-sign-in';

describe('Team Sign In screen', () => {
  it('renders the team-name and team-PIN fields plus the Continue button', () => {
    const { getByText, getByPlaceholderText } = render(
      <ThemeProvider>
        <TeamSignIn />
      </ThemeProvider>
    );

    expect(getByText('Team Sign In')).toBeTruthy();
    expect(getByText('Team name')).toBeTruthy();
    expect(getByText('Team PIN')).toBeTruthy();
    expect(getByPlaceholderText('Enter 4-digit PIN')).toBeTruthy();
    expect(getByText('Continue Team')).toBeTruthy();
  });
});
