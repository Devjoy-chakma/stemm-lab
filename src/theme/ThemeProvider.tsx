import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Theme, lightTheme, darkTheme } from './tokens';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setDarkMode: (dark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  initialDark?: boolean;
}

export function ThemeProvider({ children, initialDark = false }: ThemeProviderProps) {
  const [isDark, setIsDark] = useState(initialDark);

  const value: ThemeContextValue = {
    theme: isDark ? darkTheme : lightTheme,
    toggleTheme: () => setIsDark((prev) => !prev),
    setDarkMode: setIsDark,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
}