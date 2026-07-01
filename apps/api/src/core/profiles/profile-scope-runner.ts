import { runWithProfileDatabaseContext } from "./profile-database-context.ts";
import { ProfileDatabaseManager } from "./profile-database-manager.ts";
import { resolveProfilePaths } from "./profile-paths.ts";
import type { ProfileId } from "./profile-types.ts";
import type { ProfileStore } from "./profile-store.ts";

export interface ProfileScopeRunnerOptions {
  sailorHome: string;
  store: ProfileStore;
}

export class ProfileScopeRunner {
  private readonly sailorHome: string;
  private readonly store: ProfileStore;

  constructor(options: ProfileScopeRunnerOptions) {
    this.sailorHome = options.sailorHome;
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
      sailorHome: this.sailorHome,
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
