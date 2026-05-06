import { create } from 'zustand';

// What a team session looks like
export interface TeamMember {
  first_name: string;
}

export interface Team {
  team_id: string;          
  team_name: string;
  year_level: number;       // 3 to 9
  school_code: string;
  discriminator: string;    // 4-char random code, used in leaderboard
  members: TeamMember[];
  created_at: number;       // Date.now()
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