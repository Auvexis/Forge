import path from "node:path";

import { validateProfileId, type ProfileId } from "./profile-types.ts";

export interface ResolveProfilePathsInput {
  sailorHome?: string;
  profilesDir?: string;
  profileId: ProfileId;
  profileDirOverride?: string;
}

export interface ProfilePaths {
  profilesDir: string;
  profileDir: string;
  profileManifestPath: string;
  pluginSettingsPath: string;
  dataDir: string;
  appDbPath: string;
  workflowsDbPath: string;
  pluginsDbPath: string;
  credentialsDbPath: string;
  notificationsDbPath: string;
}

export function resolveProfilesRoot(sailorHome: string): string {
  return path.resolve(sailorHome, "profiles");
}

export function resolveProfilePaths(input: ResolveProfilePathsInput): ProfilePaths {
  const profileId = validateProfileId(input.profileId);
  const profilesDir = path.resolve(
    input.profilesDir ?? resolveProfilesRoot(requiredSailorHome(input.sailorHome)),
  );
  const profileDir = path.resolve(input.profileDirOverride ?? path.join(profilesDir, profileId));

  assertInsideProfilesRoot(profilesDir, profileDir);

  const dataDir = path.join(profileDir, "data");
  return {
    profilesDir,
    profileDir,
    profileManifestPath: path.join(profileDir, "profile.json"),
    pluginSettingsPath: path.join(profileDir, "plugin-settings.json"),
    dataDir,
    appDbPath: path.join(dataDir, "app.db"),
    workflowsDbPath: path.join(dataDir, "workflows.db"),
    pluginsDbPath: path.join(dataDir, "plugins.db"),
    credentialsDbPath: path.join(dataDir, "credentials.db"),
    notificationsDbPath: path.join(dataDir, "notifications.db"),
  };
}

function requiredSailorHome(sailorHome: string | undefined): string {
  if (!sailorHome) {
    throw new Error("sailorHome or profilesDir is required");
  }
  return sailorHome;
}

function assertInsideProfilesRoot(profilesDir: string, targetPath: string): void {
  const relative = path.relative(profilesDir, targetPath);
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    return;
  }

  throw new Error("Resolved profile path is outside profiles root");
}
