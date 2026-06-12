/**
 * Database bootstrap entry point.
 *
 * Call `initializeDatabases()` once at server startup — before any repository
 * or service is used. It ensures all four SQLite files exist, WAL mode is
 * applied, and every pending migration is executed in order.
 */

import { DatabaseManager } from "./manager.ts";
import { createMigrationEngine } from "./migration-engine.ts";
import type { ActiveProfileDatabases, ProfileDatabaseManager } from "../profiles/profile-database-manager.ts";

export async function initializeDatabases(): Promise<void> {
  console.log("[SAILOR | DB]: Initializing databases...");

  await runMigrations(DatabaseManager);

  console.log("[SAILOR | DB]: All databases are up to date.");
}

export async function initializeProfileDatabases(
  manager: ProfileDatabaseManager,
): Promise<void> {
  await runMigrations(manager.getAll());
}

async function runMigrations(databases: ActiveProfileDatabases): Promise<void> {
  const entries: Array<[keyof ActiveProfileDatabases, string]> = [
    ["app", "app"],
    ["workflows", "workflows"],
    ["plugins", "plugins"],
    ["credentials", "credentials"],
  ];

  for (const [key, dbName] of entries) {
    const engine = createMigrationEngine(databases[key], dbName);
    await engine.up();
  }
}

// Re-export the manager so consumers only need to import from one place
export { DatabaseManager } from "./manager.ts";
