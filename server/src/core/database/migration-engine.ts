import { Umzug } from "umzug";
import type Database from "better-sqlite3";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── SQLite-native Umzug storage ─────────────────────────────────────────────

/**
 * Custom Umzug storage that persists migration state in a `_migrations` table
 * inside the target SQLite database itself. This keeps each DB self-contained.
 */
class SQLiteStorage {
  private db: Database.Database;
  private tableName: string;

  constructor(db: Database.Database, tableName = "_migrations") {
    this.db = db;
    this.tableName = tableName;

    // Ensure the tracking table exists
    this.db
      .prepare(
        `CREATE TABLE IF NOT EXISTS ${this.tableName} (
          name TEXT PRIMARY KEY NOT NULL,
          run_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,
      )
      .run();
  }

  async logMigration({ name }: { name: string }): Promise<void> {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO ${this.tableName} (name) VALUES (?)`,
      )
      .run(name);
  }

  async unlogMigration({ name }: { name: string }): Promise<void> {
    this.db
      .prepare(`DELETE FROM ${this.tableName} WHERE name = ?`)
      .run(name);
  }

  async executed(): Promise<string[]> {
    const rows = this.db
      .prepare(`SELECT name FROM ${this.tableName} ORDER BY name ASC`)
      .all() as { name: string }[];
    return rows.map((r) => r.name);
  }
}

// ─── Engine factory ───────────────────────────────────────────────────────────

/**
 * Creates an Umzug migration engine for a specific database.
 *
 * @param db     - The better-sqlite3 connection for this database.
 * @param dbName - Logical name used to resolve the migrations directory.
 *                 Migrations live in: database/migrations/{dbName}/
 *
 * @example
 *   const engine = createMigrationEngine(DatabaseManager.workflows, 'workflows');
 *   await engine.up(); // applies all pending migrations
 */
export function createMigrationEngine(
  db: Database.Database,
  dbName: string,
): Umzug<Database.Database> {
  const migrationsDir = path.join(__dirname, "migrations", dbName);

  return new Umzug({
    migrations: {
      // Use [pattern, { cwd }] tuple for portability across Windows/Unix
      glob: ["*.{ts,js}", { cwd: migrationsDir }],
      resolve({ name, path: migPath, context }) {
        // Convert to file:// URL for Windows ESM compatibility
        const fileUrl = pathToFileURL(migPath!).href;
        return {
          name,
          up: async () => {
            const mod = await import(fileUrl);
            await mod.up(context);
          },
          down: async () => {
            const mod = await import(fileUrl);
            if (mod.down) await mod.down(context);
          },
        };
      },
    },
    context: db,
    storage: new SQLiteStorage(db),
    logger: {
      info: (msg) => {
        const tag = `[NOD8 | DB | ${dbName.toUpperCase()}]`;
        if (msg["event"] === "migrating") {
          console.log(`${tag}: Running migration "${msg["name"]}"`);
        } else if (msg["event"] === "migrated") {
          console.log(`${tag}: Applied "${msg["name"]}" (${msg["durationSeconds"]}s)`);
        } else if (msg["event"] === "up") {
          // Umzug emits this when there are no pending migrations
          console.log(`${tag}: No pending migrations.`);
        } else {
          console.log(`${tag}: ${JSON.stringify(msg)}`);
        }
      },
      warn: (msg) =>
        console.warn(
          `[NOD8 | DB | ${dbName.toUpperCase()}]: ${JSON.stringify(msg)}`,
        ),
      error: (msg) =>
        console.error(
          `[NOD8 | DB | ${dbName.toUpperCase()}]: ${JSON.stringify(msg)}`,
        ),
      debug: () => {}, // suppress debug noise
    },
  });
}
