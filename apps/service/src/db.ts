import Database from 'better-sqlite3'

let db: Database.Database | null = null

export function initDb(path = './data.db'): void {
  db = new Database(path)
  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      game_id TEXT NOT NULL,
      max_plays INTEGER NOT NULL DEFAULT 3,
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      config TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS prizes (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL REFERENCES campaigns(id),
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('virtual','physical','coupon')),
      weight INTEGER NOT NULL DEFAULT 1,
      stock INTEGER NOT NULL DEFAULT -1
    );

    CREATE TABLE IF NOT EXISTS user_plays (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      game_id TEXT NOT NULL,
      prize_id TEXT,
      played_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL REFERENCES campaigns(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('once','cumulative')),
      target_count INTEGER NOT NULL DEFAULT 1,
      trigger TEXT NOT NULL CHECK(trigger IN ('play','win')),
      prize_id TEXT NOT NULL REFERENCES prizes(id),
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_task_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      task_id TEXT NOT NULL REFERENCES tasks(id),
      campaign_id TEXT NOT NULL,
      current_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'in_progress'
        CHECK(status IN ('in_progress','completed','claimed')),
      completed_at TEXT,
      claimed_at TEXT,
      UNIQUE(user_id, task_id)
    );
  `)
}

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized. Call initDb() first.')
  return db
}
