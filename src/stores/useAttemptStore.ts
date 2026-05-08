import { create } from 'zustand';

export interface Attempt {
  attempt_id: string;
  team_id: string;
  activity_id: string;
  started_at: number;
  finished_at: number | null;
  score: number | null;
  raw_data: Record<string, any>;
  write_up: string;
}

interface AttemptStore {
  current: Attempt | null;
  history: Attempt[]; // completed attempts in this session

  startAttempt: (team_id: string, activity_id: string) => void;
  updateRawData: (data: Record<string, any>) => void;
  setScore: (score: number) => void;
  setWriteUp: (text: string) => void;
  finishAttempt: () => void;
  clearAttempt: () => void;

  // Selectors
  getPreviousAttemptForActivity: (activity_id: string) => Attempt | null;
}

const makeId = () =>
  `attempt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const useAttemptStore = create<AttemptStore>((set, get) => ({
  current: null,
  history: [],

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
        ? {
            current: {
              ...state.current,
              raw_data: { ...state.current.raw_data, ...data },
            },
          }
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
    set((state) => {
      if (!state.current) return state;
      const finished: Attempt = {
        ...state.current,
        finished_at: Date.now(),
      };
      return {
        current: finished,
        history: [...state.history, finished],
      };
    }),

  clearAttempt: () => set({ current: null }),

  // Returns the most recent FINISHED attempt for this activity,
  // EXCLUDING the current one if it's also for the same activity.
  getPreviousAttemptForActivity: (activity_id) => {
    const { history, current } = get();
    const previous = history
      .filter(
        (a) =>
          a.activity_id === activity_id &&
          a.finished_at !== null &&
          a.attempt_id !== current?.attempt_id
      )
      .sort((a, b) => (b.finished_at ?? 0) - (a.finished_at ?? 0));
    return previous[0] ?? null;
  },
}));