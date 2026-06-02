import {
  bestPerTeamActivity,
  computeTeamTotals,
  rankActivity,
  RawLeaderboardEntry,
} from './leaderboardAggregation';

const E = (
  discriminator: string,
  team_name: string,
  activity_id: string,
  score: number
): RawLeaderboardEntry => ({ discriminator, team_name, activity_id, score });

describe('bestPerTeamActivity', () => {
  it('returns an empty array for empty input', () => {
    expect(bestPerTeamActivity([])).toEqual([]);
  });

  it('passes through unique (team, activity) entries unchanged', () => {
    const entries = [
      E('A', 'Alpha', 'parachute', 80),
      E('B', 'Beta', 'parachute', 70),
      E('A', 'Alpha', 'sound', 60),
    ];
    expect(bestPerTeamActivity(entries)).toHaveLength(3);
  });

  it('collapses duplicate (team, activity) entries to the max score', () => {
    const entries = [
      E('A', 'Alpha', 'parachute', 50),
      E('A', 'Alpha', 'parachute', 80),
      E('A', 'Alpha', 'parachute', 65),
    ];
    const out = bestPerTeamActivity(entries);
    expect(out).toHaveLength(1);
    expect(out[0].score).toBe(80);
  });
});

describe('rankActivity', () => {
  it('returns an empty array when no team has done the activity', () => {
    const entries = [E('A', 'Alpha', 'sound', 50)];
    expect(rankActivity(entries, 'parachute')).toEqual([]);
  });

  it('filters by activity_id and sorts by score DESC', () => {
    const entries = [
      E('A', 'Alpha', 'parachute', 50),
      E('B', 'Beta', 'parachute', 90),
      E('C', 'Cobra', 'parachute', 70),
      E('B', 'Beta', 'sound', 100), // wrong activity, ignored
    ];
    const out = rankActivity(entries, 'parachute');
    expect(out).toHaveLength(3);
    expect(out.map((r) => r.team_name)).toEqual(['Beta', 'Cobra', 'Alpha']);
    expect(out.map((r) => r.score)).toEqual([90, 70, 50]);
  });

  it('attaches sequential ranks starting at 1', () => {
    const entries = [
      E('A', 'Alpha', 'parachute', 30),
      E('B', 'Beta', 'parachute', 90),
      E('C', 'Cobra', 'parachute', 60),
    ];
    const out = rankActivity(entries, 'parachute');
    expect(out.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it('collapses duplicate (team, activity) entries before ranking', () => {
    const entries = [
      E('A', 'Alpha', 'parachute', 50),
      E('A', 'Alpha', 'parachute', 95),
      E('B', 'Beta', 'parachute', 80),
    ];
    const out = rankActivity(entries, 'parachute');
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ team_name: 'Alpha', score: 95, rank: 1 });
    expect(out[1]).toMatchObject({ team_name: 'Beta', score: 80, rank: 2 });
  });
});

describe('computeTeamTotals', () => {
  it('returns an empty array for empty input', () => {
    expect(computeTeamTotals([])).toEqual([]);
  });

  it('sums each team\'s best score per activity', () => {
    const entries = [
      E('A', 'Alpha', 'parachute', 80),
      E('A', 'Alpha', 'sound', 60),
      E('A', 'Alpha', 'breathing', 40),
      E('B', 'Beta', 'parachute', 100),
    ];
    const out = computeTeamTotals(entries);
    expect(out).toHaveLength(2);
    const alpha = out.find((t) => t.discriminator === 'A');
    const beta = out.find((t) => t.discriminator === 'B');
    expect(alpha?.total).toBe(180); // 80 + 60 + 40
    expect(beta?.total).toBe(100);
  });

  it('uses only the best score when a team has multiple entries per activity', () => {
    const entries = [
      E('A', 'Alpha', 'parachute', 50),
      E('A', 'Alpha', 'parachute', 80), // best for this activity
      E('A', 'Alpha', 'sound', 60),
    ];
    const out = computeTeamTotals(entries);
    expect(out[0].total).toBe(140); // 80 + 60, NOT 50+80+60
  });

  it('ranks teams by total DESC', () => {
    const entries = [
      E('A', 'Alpha', 'parachute', 100),
      E('B', 'Beta', 'parachute', 50),
      E('B', 'Beta', 'sound', 90),
      E('C', 'Cobra', 'parachute', 70),
    ];
    const out = computeTeamTotals(entries);
    expect(out.map((t) => t.team_name)).toEqual(['Beta', 'Alpha', 'Cobra']);
    expect(out.map((t) => t.total)).toEqual([140, 100, 70]);
    expect(out.map((t) => t.rank)).toEqual([1, 2, 3]);
  });

  it('counts activities_completed per team', () => {
    const entries = [
      E('A', 'Alpha', 'parachute', 50),
      E('A', 'Alpha', 'sound', 60),
      E('A', 'Alpha', 'breathing', 40),
      E('B', 'Beta', 'parachute', 70),
    ];
    const out = computeTeamTotals(entries);
    expect(out.find((t) => t.discriminator === 'A')?.activities_completed).toBe(3);
    expect(out.find((t) => t.discriminator === 'B')?.activities_completed).toBe(1);
  });

  it('teams that have done more activities can outrank teams with a higher single score', () => {
    const entries = [
      E('A', 'Alpha', 'parachute', 50),
      E('A', 'Alpha', 'sound', 50),
      E('A', 'Alpha', 'breathing', 50),
      E('A', 'Alpha', 'hand-fan', 50),
      E('B', 'Beta', 'parachute', 100),
    ];
    const out = computeTeamTotals(entries);
    // Alpha total 200 beats Beta total 100
    expect(out[0].discriminator).toBe('A');
    expect(out[0].total).toBe(200);
    expect(out[1].discriminator).toBe('B');
    expect(out[1].total).toBe(100);
  });
});
