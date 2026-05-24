import * as SQLite from "expo-sqlite";

let database: SQLite.SQLiteDatabase | null = null;

export async function getDatabase() {
  if (database) return database;

  database = await SQLite.openDatabaseAsync("stemm-lab.db");

  await database.execAsync("PRAGMA foreign_keys = ON;");

  // TEMP RESET DATABASE
  await database.execAsync(`
    DELETE FROM write_ups;
    DELETE FROM attempt_results;
    DELETE FROM activity_attempts;
    DELETE FROM team_members;
    DELETE FROM teams;
  `);

  return database;
}
