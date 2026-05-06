import { create } from 'zustand';

// What an in-progress attempt looks like
export interface Attempt {
  attempt_id: string;       // local UUID
  team_id: string;
  activity_id: string;      // 'parachute', 'sound', etc.
  started_at: number;       // Date.now() when Run tab opened
  finished_at: number | null;
  score: number | null;
  raw_data: Record<string, any>;  // activity-specific data
  write_up: string;
}

interface AttemptStore {
  // state
  current: Attempt | null;

  // actions
  startAttempt: (team_id: string, activity_id: string) => void;
  updateRawData: (data: Record<string, any>) => void;
  setScore: (score: number) => void;
  setWriteUp: (text: string) => void;
  finishAttempt: () => void;
  clearAttempt: () => void;
}

// Helper to make a unique-ish ID without an extra library
const makeId = () =>
  `attempt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const useAttemptStore = create<AttemptStore>((set) => ({
  current: null,

  startAttempt: (team_id, activity_id) =>
    set({
      current: {
        attempt_id: makeId(),
        team_id,
        activity_id,
        started_at: Date.now(),
        finished_at: null,
        score: null,
        raw_data: {},
        write_up: '',
      },
    }),

  updateRawData: (data) =>
    set((state) =>
      state.current
        ? { current: { ...state.current, raw_data: { ...state.current.raw_data, ...data } } }
        : state
    ),

  setScore: (score) =>
    set((state) =>
      state.current ? { current: { ...state.current, score } } : state
    ),

  setWriteUp: (text) =>
    set((state) =>
      state.current ? { current: { ...state.current, write_up: text } } : state
    ),

  finishAttempt: () =>
    set((state) =>
      state.current
        ? { current: { ...state.current, finished_at: Date.now() } }
        : state
    ),

  clearAttempt: () => set({ current: null }),
}));