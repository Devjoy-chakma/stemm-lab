import React, { ReactNode, createContext, useContext, useState } from "react";
import { Theme, darkTheme, lightTheme } from "./tokens";

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setDarkMode: (dark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  initialDark?: boolean;
}

export function ThemeProvider({
  children,
  initialDark = false,
}: ThemeProviderProps) {
  const [isDark, setIsDark] = useState(initialDark);

  const value: ThemeContextValue = {
    theme: isDark ? darkTheme : lightTheme,
    isDark,
    toggleTheme: () => setIsDark((prev) => !prev),
    setDarkMode: setIsDark,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);

  if (!ctx) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }

  return ctx;
}
