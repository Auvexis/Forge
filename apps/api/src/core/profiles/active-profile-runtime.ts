import { initializeProfileDatabases } from "../database/index.ts";
import { loadPlugins } from "../modules/plugins/loader.ts";
import { PluginManager } from "../modules/plugins/manager.ts";
import { Scheduler } from "../modules/scheduler/scheduler.ts";
import { readProfilePluginSettings } from "../runtime/profile-plugin-settings.ts";
import { sailorHomePaths } from "../runtime/sailor-home.ts";
import { ActiveProfileService } from "./active-profile-service.ts";
import { ProfileDatabaseManager } from "./profile-database-manager.ts";
import { ProfilePasswordService } from "./profile-password-service.ts";
import { ProfileScopeRunner } from "./profile-scope-runner.ts";
import { ProfileStore } from "./profile-store.ts";

export const activeProfileRuntime = (() => {
  const profileStore = new ProfileStore({ sailorHome: sailorHomePaths.home });
  const passwordService = new ProfilePasswordService({ store: profileStore });
  const databaseManager = new ProfileDatabaseManager();
  const profileScopeRunner = new ProfileScopeRunner({
    sailorHome: sailorHomePaths.home,
    store: profileStore,
  });
  Scheduler.configureProfileScope({
    listProfileIds: () => profileScopeRunner.listProfileIds(),
    runWithProfile: (profileId, callback) =>
      profileScopeRunner.runWithProfile(profileId, callback),
  });
  const activeProfileService = new ActiveProfileService({
    sailorHome: sailorHomePaths.home,
    store: profileStore,
    passwordService,
    databaseManager,
    migrate: async () => initializeProfileDatabases(databaseManager),
    loadProfilePluginSettings: async (_profile, paths) => {
      readProfilePluginSettings(paths.profileDir);
    },
    loadPlugins: async () => {
      PluginManager.clearPlugins();
      await loadPlugins({ registryDb: databaseManager.plugins });
    },
    scheduler: Scheduler,
  });

  return {
    profileStore,
    passwordService,
    databaseManager,
    profileScopeRunner,
    activeProfileService,
    start: () => activeProfileService.start(),
    close: () => databaseManager.close(),
  };
})();
