import { render, screen } from '@testing-library/react-native';
import App from './App';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
  });

  it('shows the default Expo welcome text', () => {
    render(<App />);
    expect(
      screen.getByText(/Open up App\.tsx to start working on your app!/i),
    ).toBeOnTheScreen();
  });
});