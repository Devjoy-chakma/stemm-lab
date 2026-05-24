export const CREATE_USERS_TABLE = `
CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  firebase_uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_login_at TEXT NOT NULL
);
`;

export const CREATE_TEAMS_TABLE = `
CREATE TABLE IF NOT EXISTS teams (
  team_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  team_name TEXT NOT NULL,
  discriminator TEXT NOT NULL UNIQUE,
  grade_level INTEGER NOT NULL,
  team_pin TEXT NOT NULL,
  created_at TEXT NOT NULL,
  ended_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(user_id)
);
`;

export const CREATE_TEAM_MEMBERS_TABLE = `
CREATE TABLE IF NOT EXISTS team_members (
  member_id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  first_name TEXT NOT NULL,
  joined_at TEXT NOT NULL,
  FOREIGN KEY(team_id) REFERENCES teams(team_id) ON DELETE CASCADE
);
`;

export const CREATE_ACTIVITIES_TABLE = `
CREATE TABLE IF NOT EXISTS activities (
  activity_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);
`;

export const CREATE_ACTIVITY_ATTEMPTS_TABLE = `
CREATE TABLE IF NOT EXISTS activity_attempts (
  attempt_id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  activity_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL,
  FOREIGN KEY(team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
  FOREIGN KEY(activity_id) REFERENCES activities(activity_id)
);
`;

export const CREATE_ATTEMPT_RESULTS_TABLE = `
CREATE TABLE IF NOT EXISTS attempt_results (
  result_id INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id INTEGER NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value REAL NOT NULL,
  unit TEXT NOT NULL,
  member_id INTEGER,
  FOREIGN KEY(attempt_id) REFERENCES activity_attempts(attempt_id) ON DELETE CASCADE,
  FOREIGN KEY(member_id) REFERENCES team_members(member_id)
);
`;

export const CREATE_WRITEUPS_TABLE = `
CREATE TABLE IF NOT EXISTS write_ups (
  writeup_id INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id INTEGER NOT NULL UNIQUE,
  prediction TEXT,
  outcome TEXT,
  reflection TEXT,
  was_correct INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY(attempt_id) REFERENCES activity_attempts(attempt_id) ON DELETE CASCADE
);
`;

export const CREATE_MEDIA_FILES_TABLE = `
CREATE TABLE IF NOT EXISTS media_files (
  media_id INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id INTEGER NOT NULL,
  file_uri TEXT NOT NULL,
  media_type TEXT NOT NULL,
  gps_lat REAL,
  gps_lng REAL,
  duration_ms INTEGER,
  captured_at TEXT NOT NULL,
  uploaded_to_cloud INTEGER NOT NULL DEFAULT 0,
  cloud_url TEXT,
  FOREIGN KEY(attempt_id) REFERENCES activity_attempts(attempt_id) ON DELETE CASCADE
);
`;

export const CREATE_APP_SETTINGS_TABLE = `
CREATE TABLE IF NOT EXISTS app_settings (
  settings_id INTEGER PRIMARY KEY,
  theme_mode TEXT NOT NULL DEFAULT 'light',
  font_scale REAL NOT NULL DEFAULT 1.0,
  high_contrast INTEGER NOT NULL DEFAULT 0,
  sound_enabled INTEGER NOT NULL DEFAULT 1,
  notifications_enabled INTEGER NOT NULL DEFAULT 1
);
`;

export const CREATE_META_TABLE = `
CREATE TABLE IF NOT EXISTS _meta (
  schema_version INTEGER NOT NULL
);
`;
