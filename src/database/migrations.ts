import { getDatabase } from "./database";
import {
  CREATE_ACTIVITIES_TABLE,
  CREATE_ACTIVITY_ATTEMPTS_TABLE,
  CREATE_APP_SETTINGS_TABLE,
  CREATE_ATTEMPT_RESULTS_TABLE,
  CREATE_MEDIA_FILES_TABLE,
  CREATE_META_TABLE,
  CREATE_TEAMS_TABLE,
  CREATE_TEAM_MEMBERS_TABLE,
  CREATE_USERS_TABLE,
  CREATE_WRITEUPS_TABLE,
} from "./schema";

export async function runMigrations() {
  const db = await getDatabase();

  await db.execAsync(CREATE_USERS_TABLE);

  await db.execAsync(CREATE_TEAMS_TABLE);

  await db.execAsync(CREATE_TEAM_MEMBERS_TABLE);

  await db.execAsync(CREATE_ACTIVITIES_TABLE);

  await db.execAsync(CREATE_ACTIVITY_ATTEMPTS_TABLE);

  await db.execAsync(CREATE_ATTEMPT_RESULTS_TABLE);

  await db.execAsync(CREATE_WRITEUPS_TABLE);

  await db.execAsync(CREATE_MEDIA_FILES_TABLE);

  await db.execAsync(CREATE_APP_SETTINGS_TABLE);

  await db.execAsync(CREATE_META_TABLE);

  console.log("SQLite migrations completed");
}
