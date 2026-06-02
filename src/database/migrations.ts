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

// =====================================================================
// Schema versioning
//
// Bump SCHEMA_VERSION whenever a CREATE TABLE in schema.ts changes in a
// way that affects already-installed databases (added/dropped column,
// changed type, new index, etc.). For each bump, add a matching entry
// to MIGRATIONS keyed by the *target* version it produces.
//
// History:
//   v1 — initial schema (no version recorded; pre-migration system)
//   v2 — added `team_pin` column to `teams` (sign-up now requires a
//        4-digit PIN; existing dev databases were missing this column).
//   v3 — added `gps_lat` and `gps_lng` columns to `activity_attempts`
//        for the GPS location-tagging feature.
// =====================================================================

const SCHEMA_VERSION = 3;

type DB = Awaited<ReturnType<typeof getDatabase>>;
type Migration = (db: DB) => Promise<void>;

const MIGRATIONS: Record<number, Migration> = {
  // 1 → 2: add team_pin so existing dev databases keep working after the
  // sign-up flow was rebuilt around a 4-digit team PIN. SQLite has no
  // "ADD COLUMN IF NOT EXISTS", so the try/catch is the idiomatic guard
  // — on fresh installs the column already exists from CREATE TABLE and
  // ALTER throws "duplicate column", which we swallow.
  2: async (db) => {
    try {
      await db.execAsync(
        `ALTER TABLE teams ADD COLUMN team_pin TEXT NOT NULL DEFAULT ''`
      );
    } catch {
      // Column already present — fresh install, or migration already ran.
    }
  },

  // 2 → 3: add gps_lat / gps_lng to activity_attempts so each persisted
  // attempt can carry the GPS coordinates captured when it was started.
  // Both columns are nullable — old rows just stay null.
  3: async (db) => {
    try {
      await db.execAsync(
        `ALTER TABLE activity_attempts ADD COLUMN gps_lat REAL`
      );
    } catch {
      // Column already present.
    }
    try {
      await db.execAsync(
        `ALTER TABLE activity_attempts ADD COLUMN gps_lng REAL`
      );
    } catch {
      // Column already present.
    }
  },
};

export async function runMigrations() {
  try {
    const db = await getDatabase();

    // 1. Create base tables. No-op on existing databases (IF NOT EXISTS),
    //    creates everything on a fresh install.
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

    // 2. Read the recorded schema version. Databases set up before this
    //    migration system existed have an empty _meta table — treat
    //    those as v1 so the pending v1→v2 migration runs.
    const row = await db.getFirstAsync<{ schema_version: number }>(
      `SELECT schema_version FROM _meta LIMIT 1`
    );
    const currentVersion = row?.schema_version ?? 1;

    // 3. Run each pending migration in order (idempotent per the guards
    //    inside each step).
    for (let v = currentVersion + 1; v <= SCHEMA_VERSION; v++) {
      const migrate = MIGRATIONS[v];
      if (!migrate) continue;
      await migrate(db);
      console.log(`SQLite migrated to schema v${v}`);
    }

    // 4. Record the current version (_meta is a single-row table).
    await db.runAsync(`DELETE FROM _meta`);
    await db.runAsync(
      `INSERT INTO _meta (schema_version) VALUES (?)`,
      [SCHEMA_VERSION]
    );

    console.log(`SQLite migrations completed (schema v${SCHEMA_VERSION})`);
  } catch (error) {
    console.error("SQLite migration failed:", error);
  }
}
