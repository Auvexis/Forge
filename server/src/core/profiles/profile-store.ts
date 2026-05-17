import fs from "node:fs";
import path from "node:path";

import { resolveProfilePaths, resolveProfilesRoot } from "./profile-paths.ts";
import {
  assertUniqueProfileName,
  redactProfileManifest,
  validateProfileAvatarEmoji,
  validateProfileEmail,
  validateProfileId,
  validateProfileName,
  type CreateProfileInput,
  type ProfileId,
  type ProfileManifest,
  type ProfilePasswordMetadata,
  type ProfileSummary,
  type UpdateProfileInput,
} from "./profile-types.ts";

interface ProfileIndex {
  currentProfileId: ProfileId;
  profileIds: ProfileId[];
}

export interface ProfileStoreOptions {
  sailorHome: string;
  clock?: () => Date;
}

const defaultPasswordMetadata: ProfilePasswordMetadata = {
  enabled: false,
  hash: null,
  algorithm: null,
  createdAt: null,
  updatedAt: null,
};

export class ProfileStore {
  private readonly sailorHome: string;
  private readonly profilesDir: string;
  private readonly indexPath: string;
  private readonly clock: () => Date;

  constructor(options: ProfileStoreOptions) {
    this.sailorHome = path.resolve(options.sailorHome);
    this.profilesDir = resolveProfilesRoot(this.sailorHome);
    this.indexPath = path.join(this.sailorHome, "profiles.json");
    this.clock = options.clock ?? (() => new Date());
  }

  ensureInitialized(): void {
    fs.mkdirSync(this.profilesDir, { recursive: true });

    if (!fs.existsSync(this.indexPath)) {
      if (!fs.existsSync(this.profilePaths("default").profileManifestPath)) {
        const manifest = this.createManifest({
          id: "default",
          name: "Default",
          avatarEmoji: "⛵",
        });
        this.writeManifest(manifest);
      }
      this.writeIndex({ currentProfileId: "default", profileIds: ["default"] });
      return;
    }

    this.readIndex();
  }

  listProfiles(): ProfileSummary[] {
    this.ensureInitialized();
    return this.readIndex().profileIds.map((profileId) =>
      redactProfileManifest(this.readManifest(profileId)),
    );
  }

  getProfile(profileId: ProfileId): ProfileSummary | null {
    this.ensureInitialized();
    const id = validateProfileId(profileId);
    if (!this.readIndex().profileIds.includes(id)) return null;
    return redactProfileManifest(this.readManifest(id));
  }

  getProfileManifest(profileId: ProfileId): ProfileManifest | null {
    this.ensureInitialized();
    const id = validateProfileId(profileId);
    if (!this.readIndex().profileIds.includes(id)) return null;
    return this.readManifest(id);
  }

  getCurrentProfile(): ProfileSummary | null {
    this.ensureInitialized();
    const index = this.readIndex();
    if (!index.currentProfileId) return null;
    return this.getProfile(index.currentProfileId);
  }

  createProfile(input: CreateProfileInput): ProfileSummary {
    this.ensureInitialized();
    const index = this.readIndex();
    const id = validateProfileId(input.id ?? slugifyProfileName(input.name));
    if (index.profileIds.includes(id)) {
      throw new Error(`Profile id '${id}' already exists`);
    }
    assertUniqueProfileName(input.name, this.listProfiles());

    const manifest = this.createManifest({ ...input, id });
    this.writeManifest(manifest);
    this.writeIndex({
      ...index,
      profileIds: [...index.profileIds, id],
    });

    return redactProfileManifest(manifest);
  }

  updateProfile(profileId: ProfileId, input: UpdateProfileInput): ProfileSummary {
    const manifest = this.requireManifest(profileId);
    const profiles = this.listProfiles();
    const nextName = input.name === undefined ? manifest.name : validateProfileName(input.name);
    assertUniqueProfileName(nextName, profiles, manifest.id);

    const updated: ProfileManifest = {
      ...manifest,
      name: nextName,
      avatarEmoji:
        input.avatarEmoji === undefined
          ? manifest.avatarEmoji
          : validateProfileAvatarEmoji(input.avatarEmoji),
      email: input.email === undefined ? manifest.email : validateProfileEmail(input.email),
      updatedAt: this.now(),
    };
    this.writeManifest(updated);
    return redactProfileManifest(updated);
  }

  setCurrentProfile(profileId: ProfileId): ProfileSummary {
    const id = validateProfileId(profileId);
    const index = this.readIndex();
    if (!index.profileIds.includes(id)) {
      throw new Error(`Profile '${id}' not found`);
    }
    this.writeIndex({ ...index, currentProfileId: id });
    return redactProfileManifest(this.readManifest(id));
  }

  setPasswordMetadata(profileId: ProfileId, password: ProfilePasswordMetadata): ProfileSummary {
    const manifest = this.requireManifest(profileId);
    const updated = {
      ...manifest,
      password: { ...password },
      updatedAt: this.now(),
    };
    this.writeManifest(updated);
    return redactProfileManifest(updated);
  }

  clearPasswordMetadata(profileId: ProfileId): ProfileSummary {
    return this.setPasswordMetadata(profileId, { ...defaultPasswordMetadata });
  }

  deleteProfile(profileId: ProfileId): void {
    const id = validateProfileId(profileId);
    const index = this.readIndex();
    if (index.currentProfileId === id) {
      throw new Error("Cannot delete active profile");
    }
    if (!index.profileIds.includes(id)) {
      throw new Error(`Profile '${id}' not found`);
    }

    const nextProfileIds = index.profileIds.filter((existing) => existing !== id);
    this.writeIndex({ ...index, profileIds: nextProfileIds });
    fs.rmSync(this.profilePaths(id).profileDir, { recursive: true, force: true });
  }

  private createManifest(input: CreateProfileInput & { id: ProfileId }): ProfileManifest {
    const now = this.now();
    return {
      id: validateProfileId(input.id),
      name: validateProfileName(input.name),
      avatarEmoji: validateProfileAvatarEmoji(input.avatarEmoji),
      email: validateProfileEmail(input.email),
      password: { ...defaultPasswordMetadata },
      createdAt: now,
      updatedAt: now,
    };
  }

  private requireManifest(profileId: ProfileId): ProfileManifest {
    const id = validateProfileId(profileId);
    if (!this.readIndex().profileIds.includes(id)) {
      throw new Error(`Profile '${id}' not found`);
    }
    return this.readManifest(id);
  }

  private readIndex(): ProfileIndex {
    this.ensureInitializedFileOnly();
    return JSON.parse(fs.readFileSync(this.indexPath, "utf8")) as ProfileIndex;
  }

  private writeIndex(index: ProfileIndex): void {
    fs.mkdirSync(this.sailorHome, { recursive: true });
    fs.writeFileSync(this.indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  }

  private readManifest(profileId: ProfileId): ProfileManifest {
    return JSON.parse(
      fs.readFileSync(this.profilePaths(profileId).profileManifestPath, "utf8"),
    ) as ProfileManifest;
  }

  private writeManifest(manifest: ProfileManifest): void {
    const paths = this.profilePaths(manifest.id);
    fs.mkdirSync(paths.dataDir, { recursive: true });
    fs.writeFileSync(
      paths.profileManifestPath,
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );
    if (!fs.existsSync(paths.pluginSettingsPath)) {
      fs.writeFileSync(
        paths.pluginSettingsPath,
        `${JSON.stringify({ enabledPlugins: [] }, null, 2)}\n`,
        "utf8",
      );
    }
  }

  private profilePaths(profileId: ProfileId) {
    return resolveProfilePaths({ profilesDir: this.profilesDir, profileId });
  }

  private ensureInitializedFileOnly(): void {
    if (!fs.existsSync(this.indexPath)) {
      this.ensureInitialized();
    }
  }

  private now(): string {
    return this.clock().toISOString();
  }
}

function slugifyProfileName(name: string): string {
  const slug = validateProfileName(name)
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return validateProfileId(slug || "profile");
}
