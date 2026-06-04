// Renders the Team Sign Up screen and asserts the team / grade / PIN
// fields and the Create Team CTA.

import { render } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), dismissAll: jest.fn() }),
}));

jest.mock('../../src/database/repositories/teamRepository', () => ({
  createTeamSession: jest.fn(),
}));

jest.mock('../../src/lib/auth', () => ({
  ensureAnonymousAuth: jest.fn().mockResolvedValue(null),
}));

import { ThemeProvider } from '../../src/theme';
import TeamSignUp from '../../app/team-sign-up';

describe('Team Sign Up screen', () => {
  it('renders the title, fields, and the Create Team CTA', () => {
    const { getByText, getByPlaceholderText } = render(
      <ThemeProvider>
        <TeamSignUp />
      </ThemeProvider>
    );

    expect(getByText('Team Sign Up')).toBeTruthy();
    expect(getByText('Team name')).toBeTruthy();
    expect(getByText('Grade')).toBeTruthy();
    expect(getByText('Team members')).toBeTruthy();
    expect(getByText('Team PIN')).toBeTruthy();
    expect(getByPlaceholderText('Required 4-digit PIN')).toBeTruthy();
    expect(getByText('Create Team')).toBeTruthy();
    expect(getByText('+ Add member')).toBeTruthy();
  });
});
