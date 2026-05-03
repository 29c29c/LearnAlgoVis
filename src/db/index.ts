import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { env, resolveFromRoot } from "@/lib/env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  sqlite?: Database.Database;
  db?: ReturnType<typeof drizzle<typeof schema>>;
};

function createSqlite() {
  const dbPath = resolveFromRoot(env.databaseUrl.replace(/^file:/, ""));
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      disabled INTEGER NOT NULL DEFAULT 0,
      trusted INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS invite_codes (
      id TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL UNIQUE,
      label TEXT,
      max_uses INTEGER NOT NULL,
      used_count INTEGER NOT NULL DEFAULT 0,
      expires_at INTEGER,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS animations (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      style_preset TEXT NOT NULL DEFAULT 'clean-teaching',
      file_path TEXT NOT NULL,
      sha256 TEXT NOT NULL UNIQUE,
      byte_size INTEGER NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'private',
      review_status TEXT NOT NULL DEFAULT 'private',
      rejected_reason TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS directory_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      animation_id TEXT NOT NULL REFERENCES animations(id) ON DELETE CASCADE,
      custom_title TEXT,
      sort_order INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT,
      detail TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ai_settings (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      provider_id TEXT NOT NULL,
      model_id TEXT NOT NULL,
      api_key_encrypted TEXT,
      custom_base_url TEXT,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_animations_owner ON animations(owner_id);
    CREATE INDEX IF NOT EXISTS idx_animations_public ON animations(visibility, review_status, created_at);
    CREATE INDEX IF NOT EXISTS idx_directory_user_order ON directory_items(user_id, sort_order);
  `);
  return sqlite;
}

export const sqlite = globalForDb.sqlite ?? createSqlite();
export const db = globalForDb.db ?? drizzle(sqlite, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.sqlite = sqlite;
  globalForDb.db = db;
}
