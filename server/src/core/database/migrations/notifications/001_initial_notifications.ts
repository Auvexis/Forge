import type Database from "better-sqlite3";

export async function up(db: Database.Database): Promise<void> {
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY NOT NULL,
      level TEXT NOT NULL CHECK (level IN ('error', 'warning', 'info')),
      category TEXT NOT NULL DEFAULT 'global' CHECK (length(trim(category)) > 0),
      title TEXT,
      message TEXT NOT NULL CHECK (length(trim(message)) > 0),
      source TEXT,
      context_json TEXT CHECK (context_json IS NULL OR json_valid(context_json)),
      action_url TEXT,
      action_label TEXT,
      is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
      occurrence_count INTEGER NOT NULL DEFAULT 1 CHECK (occurrence_count > 0),
      created_at TEXT NOT NULL,
      last_occurred_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_category_last_occurred
      ON notifications (category, last_occurred_at DESC);

    CREATE INDEX IF NOT EXISTS idx_notifications_level_last_occurred
      ON notifications (level, last_occurred_at DESC);

    CREATE INDEX IF NOT EXISTS idx_notifications_unread_last_occurred
      ON notifications (is_read, last_occurred_at DESC);
  `);
}

export async function down(db: Database.Database): Promise<void> {
  db.prepare("DROP TABLE IF EXISTS notifications").run();
}
