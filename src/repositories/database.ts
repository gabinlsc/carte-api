import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
export function openDatabase(path: string): DatabaseSync {
  if (path !== ':memory:')
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS schema_versions(version INTEGER PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS measurements(
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, sensor_id INTEGER NOT NULL CHECK(sensor_id BETWEEN 1 AND 100),
      category TEXT NOT NULL CHECK(category IN ('sensor','station','landmark')),
      latitude REAL NOT NULL CHECK(latitude BETWEEN -90 AND 90), longitude REAL NOT NULL CHECK(longitude BETWEEN -180 AND 180),
      weather TEXT, created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS measurements_geo ON measurements(latitude,longitude);
    CREATE INDEX IF NOT EXISTS measurements_category ON measurements(category,id);
    CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), csrf TEXT NOT NULL, expires_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY, hits INTEGER NOT NULL, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS zones(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, geometry TEXT NOT NULL, created_at TEXT NOT NULL);
    INSERT OR IGNORE INTO schema_versions VALUES(1);`);
  return db;
}
export function transaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
