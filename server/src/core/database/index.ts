/**
 * Database bootstrap entry point.
 *
 * Call `initializeDatabases()` once at server startup — before any repository
 * or service is used. It ensures all four SQLite files exist, WAL mode is
 * applied, and every pending migration is executed in order.
 */

import { DatabaseManager } from "./manager.ts";
import { createMigrationEngine } from "./migration-engine.ts";

export async function initializeDatabases(): Promise<void> {
  console.log("[NOD8 | DB]: Initializing databases...");

  const entries: Array<[keyof typeof DatabaseManager, string]> = [
    ["app", "app"],
    ["workflows", "workflows"],
    ["plugins", "plugins"],
    ["credentials", "credentials"],
  ];

  for (const [key, dbName] of entries) {
    const db = DatabaseManager[key];
    const engine = createMigrationEngine(db, dbName);
    await engine.up();
  }

  console.log("[NOD8 | DB]: All databases are up to date.");
}

// Re-export the manager so consumers only need to import from one place
export { DatabaseManager } from "./manager.ts";
