
export const lightColors = {
  // Backgrounds
  background: '#FBF5E5',      // cream — main surface
  surface: '#FFFFFF',         // cards, tiles, inputs
  surfaceMuted: '#F5EFD9',    // slightly darker cream for nested cards

  // Brand
  primary: '#1D3557',         // deep navy — buttons, headings, brand
  primarySoft: '#457B9D',     // lighter navy — secondary text, borders
  accent: '#C9A961',          // gold — highlights, badges, callouts

  // Text
  text: '#1D2939',            // near-black for body
  textMuted: '#6B7280',       // grey for secondary text
  textOnPrimary: '#FBF5E5',   // cream — text on navy buttons

  // Status
  success: '#2A9D8F',         // teal-green
  warning: '#E76F51',         // burnt orange
  danger: '#E63946',          // red

  // Borders
  border: '#E5E7EB',          // soft grey border
  borderStrong: '#457B9D',    // navy-soft for emphasized borders
};

export const darkColors = {
  background: '#1D2939',
  surface: '#283448',
  surfaceMuted: '#1F2A3A',

  primary: '#FBF5E5',         // inverted — cream becomes "primary" in dark
  primarySoft: '#A8C5DA',
  accent: '#D4B775',

  text: '#FBF5E5',
  textMuted: '#94A3B8',
  textOnPrimary: '#1D3557',

  success: '#5FCFC4',
  warning: '#F4A28C',
  danger: '#FF6B7A',

  border: '#3A4A60',
  borderStrong: '#A8C5DA',
};

// ---------- SPACING ----------
// 4px base unit — multiples of 4 for visual rhythm

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// ---------- RADIUS ----------

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
};

// ---------- TYPOGRAPHY ----------

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 36,
  hero: 48,
};

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

// ---------- THEME TYPES ----------

export type ThemeColors = typeof lightColors;

export interface Theme {
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  isDark: boolean;
}

export const lightTheme: Theme = {
  colors: lightColors,
  spacing,
  radius,
  fontSize,
  fontWeight,
  isDark: false,
};

export const darkTheme: Theme = {
  colors: darkColors,
  spacing,
  radius,
  fontSize,
  fontWeight,
  isDark: true,
};