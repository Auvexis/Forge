import { runWithProfileDatabaseContext } from "./profile-database-context.ts";
import { ProfileDatabaseManager } from "./profile-database-manager.ts";
import { resolveProfilePaths } from "./profile-paths.ts";
import type { ProfileId } from "./profile-types.ts";
import type { ProfileStore } from "./profile-store.ts";

export interface ProfileScopeRunnerOptions {
  fabricHome: string;
  store: ProfileStore;
}

export class ProfileScopeRunner {
  private readonly fabricHome: string;
  private readonly store: ProfileStore;

  constructor(options: ProfileScopeRunnerOptions) {
    this.fabricHome = options.fabricHome;
    this.store = options.store;
  }

  listProfileIds(): ProfileId[] {
    return this.store.listProfiles().map((profile) => profile.id);
  }

  runWithProfile<T>(profileId: ProfileId, callback: () => T): T {
    if (!this.store.getProfile(profileId)) {
      throw new Error(`Profile '${profileId}' not found`);
    }

    const manager = new ProfileDatabaseManager();
    manager.open(resolveProfilePaths({
      fabricHome: this.fabricHome,
      profileId,
    }));

    try {
      const result = runWithProfileDatabaseContext(manager.getAll(), callback);
      if (result instanceof Promise) {
        return result.finally(() => manager.close()) as T;
      }

      manager.close();
      return result;
    } catch (error) {
      manager.close();
      throw error;
    }
  }
}
