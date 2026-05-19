import { create } from 'zustand';

// What a team session looks like
export interface TeamMember {
  first_name: string;
}

// Field names mirror the SQLite `teams` table (see src/database/schema.ts)
// so the store, the repository, and persistence stay in sync.
export interface Team {
  team_id: string;
  team_name: string;
  grade_level: number;          // 3 to 9 (was: year_level)
  event_code: string | null;    // optional class/event code (was: school_code)
  discriminator: string;        // STEM-#### code, used in the leaderboard
  members: TeamMember[];
  created_at: number;           // Date.now()
}

interface TeamStore {
  // state
  team: Team | null;

  // actions
  setTeam: (team: Team) => void;
  clearTeam: () => void;
}

export const useTeamStore = create<TeamStore>((set) => ({
  // default state — no team until one is created
  team: null,

  setTeam: (team) => set({ team }),
  clearTeam: () => set({ team: null }),
}));