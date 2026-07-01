import { resolveProfilePaths, type ProfilePaths } from "./profile-paths.ts";
import type Database from "better-sqlite3";
import type { ProfilePasswordService } from "./profile-password-service.ts";
import type { ProfileDatabaseManager } from "./profile-database-manager.ts";
import type { ProfileId, ProfileSummary } from "./profile-types.ts";
import type { ProfileStore } from "./profile-store.ts";
import { setAppDatabaseProvider } from "../modules/app/app-repository.ts";
import {
  setWorkflowDatabaseProvider,
  setWorkflowGitSnapshotDataDir,
} from "../modules/workflows/repository.ts";
import {
  setCredentialsDatabaseProvider,
} from "../modules/plugins/credential-store.ts";
import {
  setOAuth2SessionDatabaseProvider,
} from "../modules/plugins/auth/oauth2-session-store.ts";
import { setPluginRegistryDatabaseProvider } from "../modules/plugins/plugin-registry.ts";
import { getProfileDatabaseContext } from "./profile-database-context.ts";
import { setNotificationDatabaseProvider } from "../modules/notifications/notification-repository.ts";

export interface SwitchProfileInput {
  profileId: ProfileId;
  password?: string;
}

interface ProfileDatabaseManagerLike {
  open(paths: ProfilePaths): void;
  close(): void;
  app?: unknown;
  workflows?: unknown;
  plugins?: unknown;
  credentials?: unknown;
  notifications?: unknown;
}

interface SchedulerLike {
  stopAll?(): void;
  resync(): void;
}

type ProfileActivationHook = (
  profile: ProfileSummary,
  paths: ProfilePaths,
) => Promise<void> | void;

export interface ActiveProfileServiceOptions {
  sailorHome: string;
  store: ProfileStore;
  passwordService: ProfilePasswordService;
  databaseManager: ProfileDatabaseManager | ProfileDatabaseManagerLike;
  configureProfileRepositories?: (
    manager: ProfileDatabaseManager | ProfileDatabaseManagerLike,
  ) => void;
  migrate: ProfileActivationHook;
  loadProfilePluginSettings: ProfileActivationHook;
  loadPlugins: ProfileActivationHook;
  scheduler: SchedulerLike;
}

export class ActiveProfileService {
  private readonly sailorHome: string;
  private readonly store: ProfileStore;
  private readonly passwordService: ProfilePasswordService;
  private readonly databaseManager: ProfileDatabaseManager | ProfileDatabaseManagerLike;
  private readonly configureProfileRepositories: (
    manager: ProfileDatabaseManager | ProfileDatabaseManagerLike,
  ) => void;
  private readonly migrate: ProfileActivationHook;
  private readonly loadProfilePluginSettings: ProfileActivationHook;
  private readonly loadPlugins: ProfileActivationHook;
  private readonly scheduler: SchedulerLike;
  private activeProfile: ProfileSummary | null = null;

  constructor(options: ActiveProfileServiceOptions) {
    this.sailorHome = options.sailorHome;
    this.store = options.store;
    this.passwordService = options.passwordService;
    this.databaseManager = options.databaseManager;
    this.configureProfileRepositories =
      options.configureProfileRepositories ?? configureDefaultProfileRepositories;
    this.migrate = options.migrate;
    this.loadProfilePluginSettings = options.loadProfilePluginSettings;
    this.loadPlugins = options.loadPlugins;
    this.scheduler = options.scheduler;
  }

  async start(): Promise<ProfileSummary> {
    this.store.ensureInitialized();
    const current = this.store.getCurrentProfile();
    if (!current) {
      throw new Error("No current profile configured");
    }

    await this.activateProfile(current);
    this.activeProfile = current;
    return current;
  }

  getActiveProfile(): ProfileSummary | null {
    return this.activeProfile;
  }

  async switchProfile(input: SwitchProfileInput): Promise<ProfileSummary> {
    const targetManifest = this.store.getProfileManifest(input.profileId);
    if (!targetManifest) {
      throw new Error(`Profile '${input.profileId}' not found`);
    }

    if (targetManifest.password.enabled) {
      if (!input.password) {
        throw new Error("PROFILE_PASSWORD_REQUIRED");
      }
      if (!this.passwordService.verifyPassword({ profileId: input.profileId, password: input.password })) {
        throw new Error("PROFILE_PASSWORD_INVALID");
      }
    }

    const previous = this.activeProfile;
    const target = this.store.getProfile(input.profileId);
    if (!target) {
      throw new Error(`Profile '${input.profileId}' not found`);
    }

    try {
      this.scheduler.stopAll?.();
      await this.activateProfile(target);
      const current = this.store.setCurrentProfile(target.id);
      this.activeProfile = current;
      return current;
    } catch (error) {
      if (previous) {
        await this.restorePreviousProfile(previous);
      }
      throw error;
    }
  }

  private async activateProfile(profile: ProfileSummary): Promise<void> {
    const profilePaths = resolveProfilePaths({
      sailorHome: this.sailorHome,
      profileId: profile.id,
    });
    this.databaseManager.open(profilePaths);
    setWorkflowGitSnapshotDataDir(profilePaths.dataDir);
    this.configureProfileRepositories(this.databaseManager);
    await this.migrate(profile, profilePaths);
    await this.loadProfilePluginSettings(profile, profilePaths);
    await this.loadPlugins(profile, profilePaths);
    this.scheduler.resync();
  }

  private async restorePreviousProfile(profile: ProfileSummary): Promise<void> {
    const profilePaths = resolveProfilePaths({
      sailorHome: this.sailorHome,
      profileId: profile.id,
    });
    this.databaseManager.open(profilePaths);
    setWorkflowGitSnapshotDataDir(profilePaths.dataDir);
    this.configureProfileRepositories(this.databaseManager);
    await this.migrate(profile, profilePaths);
    await this.loadProfilePluginSettings(profile, profilePaths);
    await this.loadPlugins(profile, profilePaths);
    this.scheduler.resync();
    this.activeProfile = profile;
  }
}

function configureDefaultProfileRepositories(
  manager: ProfileDatabaseManager | ProfileDatabaseManagerLike,
): void {
  const app = manager.app;
  const workflows = manager.workflows;
  const plugins = manager.plugins;
  const credentials = manager.credentials;
  const notifications = manager.notifications;
  if (
    !isDatabaseLike(app) ||
    !isDatabaseLike(workflows) ||
    !isDatabaseLike(plugins) ||
    !isDatabaseLike(credentials) ||
    !isDatabaseLike(notifications)
  ) {
    return;
  }

  setAppDatabaseProvider(() => getProfileDatabaseContext()?.app ?? app);
  setWorkflowDatabaseProvider(() => getProfileDatabaseContext()?.workflows ?? workflows);
  setPluginRegistryDatabaseProvider(() => getProfileDatabaseContext()?.plugins ?? plugins);
  setCredentialsDatabaseProvider(() => getProfileDatabaseContext()?.credentials ?? credentials);
  setOAuth2SessionDatabaseProvider(() => getProfileDatabaseContext()?.credentials ?? credentials);
  setNotificationDatabaseProvider(() => getProfileDatabaseContext()?.notifications ?? notifications);
}

function isDatabaseLike(value: unknown): value is Database.Database {
  return typeof value === "object" && value !== null && "prepare" in value;
}
