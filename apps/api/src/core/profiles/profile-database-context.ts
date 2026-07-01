import { AsyncLocalStorage } from "node:async_hooks";

import type { ActiveProfileDatabases } from "./profile-database-manager.ts";

const profileDatabaseContext = new AsyncLocalStorage<ActiveProfileDatabases>();

export function getProfileDatabaseContext(): ActiveProfileDatabases | null {
  return profileDatabaseContext.getStore() ?? null;
}

export function runWithProfileDatabaseContext<T>(
  databases: ActiveProfileDatabases,
  callback: () => T,
): T {
  return profileDatabaseContext.run(databases, callback);
}
