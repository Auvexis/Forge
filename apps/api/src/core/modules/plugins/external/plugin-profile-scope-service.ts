import fs from "node:fs";
import path from "node:path";
import {
  readProfilePluginSettings,
  writeProfilePluginSettings,
  type ProfilePluginReference,
} from "../../../runtime/profile-plugin-settings.ts";
import type { PluginInstallScope } from "./types.ts";
import { resolveProfilePaths } from "../../../profiles/profile-paths.ts";
import type { ProfileId } from "../../../profiles/profile-types.ts";

export interface ApplyPluginProfileScopeInput {
  profilesDir: string;
  currentProfileId?: ProfileId;
  selectedProfileId?: ProfileId;
  scope: PluginInstallScope;
  reference: ProfilePluginReference;
  defaultProfileDir?: string;
}

function upsertProfileReference(profileDir: string, reference: ProfilePluginReference): void {
  const settings = readProfilePluginSettings(profileDir);
  const withoutCurrent = settings.enabledPlugins.filter((plugin) => plugin.id !== reference.id);
  writeProfilePluginSettings(profileDir, {
    enabledPlugins: [...withoutCurrent, reference],
  });
}

function listProfileDirs(profilesDir: string, fallbackProfileDir?: string): string[] {
  const profileDirs = new Set<string>(fallbackProfileDir ? [fallbackProfileDir] : []);
  if (!fs.existsSync(profilesDir)) return Array.from(profileDirs);

  for (const entry of fs.readdirSync(profilesDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      profileDirs.add(path.join(profilesDir, entry.name));
    }
  }

  return Array.from(profileDirs);
}

function profileDirForId(profilesDir: string, profileId: ProfileId): string {
  return resolveProfilePaths({ profilesDir, profileId }).profileDir;
}

export function applyPluginProfileScope(input: ApplyPluginProfileScopeInput): void {
  let profileDirs: string[];
  if (input.scope === "all_profiles") {
    profileDirs = listProfileDirs(input.profilesDir, input.defaultProfileDir);
  } else if (input.scope === "selected_profile") {
    if (!input.selectedProfileId) {
      throw new Error("selectedProfileId is required for selected_profile plugin scope");
    }
    profileDirs = [profileDirForId(input.profilesDir, input.selectedProfileId)];
  } else {
    profileDirs = [
      input.currentProfileId
        ? profileDirForId(input.profilesDir, input.currentProfileId)
        : input.defaultProfileDir ?? profileDirForId(input.profilesDir, "default"),
    ];
  }

  for (const profileDir of profileDirs) {
    upsertProfileReference(profileDir, input.reference);
  }
}
