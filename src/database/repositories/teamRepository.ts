import { getDatabase } from "../database";

type CreateTeamInput = {
  userId: number;
  teamName: string;
  gradeLevel: number;
  teamPin: string;
  memberNames: string[];
};

function generateDiscriminator() {
  const prefix = "STEM";
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${random}`;
}

export async function createTeamSession(input: CreateTeamInput) {
  const db = await getDatabase();

  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT OR IGNORE INTO users (
    user_id,
    firebase_uid,
    email,
    created_at,
    last_login_at
  ) VALUES (?, ?, ?, ?, ?)`,
    [1, "local-dev-user", "local@stemmlab.dev", now, now]
  );

  const discriminator = generateDiscriminator();

  const result = await db.runAsync(
    `INSERT INTO teams (
      user_id,
      team_name,
      discriminator,
      grade_level,
      team_pin,
      created_at,
      ended_at
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.userId,
      input.teamName.trim(),
      discriminator,
      input.gradeLevel,
      input.teamPin,
      now,
      null,
    ]
  );

  const teamId = result.lastInsertRowId;

  for (const firstName of input.memberNames) {
    const cleanName = firstName.trim();

    if (!cleanName) continue;

    await db.runAsync(
      `INSERT INTO team_members (
        team_id,
        first_name,
        joined_at
      ) VALUES (?, ?, ?)`,
      [teamId, cleanName, now]
    );
  }

  return {
    teamId,
    discriminator,
  };
}
