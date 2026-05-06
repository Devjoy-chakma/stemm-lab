import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';

interface SettingsStore {
  // state
  theme_mode: ThemeMode;
  sound_enabled: boolean;
  tts_rate: number;     // 0.5 to 2.0
  tts_voice_id: string | null;

  // actions
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  setTtsRate: (rate: number) => void;
  setTtsVoiceId: (voiceId: string | null) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  // defaults
  theme_mode: 'light',
  sound_enabled: true,
  tts_rate: 1.0,
  tts_voice_id: null,

  setThemeMode: (mode) => set({ theme_mode: mode }),
  toggleTheme: () =>
    set((state) => ({
      theme_mode: state.theme_mode === 'light' ? 'dark' : 'light',
    })),
  setSoundEnabled: (enabled) => set({ sound_enabled: enabled }),
  setTtsRate: (rate) => set({ tts_rate: rate }),
  setTtsVoiceId: (voiceId) => set({ tts_voice_id: voiceId }),
}));