import fs from "node:fs";
import Database from "better-sqlite3";

import type { ProfilePaths } from "./profile-paths.ts";

export interface ActiveProfileDatabases {
  app: Database.Database;
  workflows: Database.Database;
  plugins: Database.Database;
  credentials: Database.Database;
  notifications: Database.Database;
}

export class ProfileDatabaseManager {
  private databases: ActiveProfileDatabases | null = null;

  open(profilePaths: ProfilePaths): void {
    this.close();
    fs.mkdirSync(profilePaths.dataDir, { recursive: true });
    this.databases = {
      app: openDatabase(profilePaths.appDbPath),
      workflows: openDatabase(profilePaths.workflowsDbPath),
      plugins: openDatabase(profilePaths.pluginsDbPath),
      credentials: openDatabase(profilePaths.credentialsDbPath),
      notifications: openDatabase(profilePaths.notificationsDbPath),
    };
  }

  close(): void {
    if (!this.databases) return;
    for (const db of Object.values(this.databases)) {
      if (db.open) {
        db.close();
      }
    }
    this.databases = null;
  }

  get app(): Database.Database {
    return this.requireDatabases().app;
  }

  get workflows(): Database.Database {
    return this.requireDatabases().workflows;
  }

  get plugins(): Database.Database {
    return this.requireDatabases().plugins;
  }

  get credentials(): Database.Database {
    return this.requireDatabases().credentials;
  }

  get notifications(): Database.Database {
    return this.requireDatabases().notifications;
  }

  getAll(): ActiveProfileDatabases {
    return this.requireDatabases();
  }

  private requireDatabases(): ActiveProfileDatabases {
    if (!this.databases) {
      throw new Error("No active profile database is open");
    }
    return this.databases;
  }
}

function openDatabase(dbPath: string): Database.Database {
  const instance = new Database(dbPath);
  instance.pragma("journal_mode = WAL");
  instance.pragma("foreign_keys = ON");
  return instance;
}
