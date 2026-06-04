// Renders MetricCard inside the real ThemeProvider and asserts the
// label/value/unit are visible. Label is rendered in uppercase by the

import { render } from '@testing-library/react-native';

import { ThemeProvider } from '../theme';
import MetricCard from './MetricCard';

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider>{ui}</ThemeProvider>);

describe('MetricCard', () => {
  it('displays label, value, and unit', () => {
    const { getByText } = renderWithTheme(
      <MetricCard label="Score" value="42" unit="pts" />
    );

    expect(getByText('SCORE')).toBeTruthy();
    expect(getByText('42')).toBeTruthy();
    expect(getByText('pts')).toBeTruthy();
  });

  it('renders without a unit', () => {
    const { getByText, queryByText } = renderWithTheme(
      <MetricCard label="Time" value="5.2" />
    );

    expect(getByText('TIME')).toBeTruthy();
    expect(getByText('5.2')).toBeTruthy();
    expect(queryByText('pts')).toBeNull();
  });
});
