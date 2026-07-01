export type ProfileId = string;

export interface ProfilePasswordMetadata {
  enabled: boolean;
  hash: string | null;
  algorithm: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ProfileManifest {
  id: ProfileId;
  name: string;
  avatarEmoji: string;
  email: string | null;
  password: ProfilePasswordMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileSummary {
  id: ProfileId;
  name: string;
  avatarEmoji: string;
  email: string | null;
  passwordProtected: boolean;
}

export interface CreateProfileInput {
  id?: ProfileId;
  name: string;
  avatarEmoji: string;
  email?: string | null;
  password?: string | null;
}

export interface UpdateProfileInput {
  name?: string;
  avatarEmoji?: string;
  email?: string | null;
}

export interface VerifyProfilePasswordInput {
  profileId: ProfileId;
  password: string;
}

const PROFILE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_PROFILE_IDS = new Set([
  "con",
  "prn",
  "aux",
  "nul",
  "com1",
  "com2",
  "com3",
  "com4",
  "com5",
  "com6",
  "com7",
  "com8",
  "com9",
  "lpt1",
  "lpt2",
  "lpt3",
  "lpt4",
  "lpt5",
  "lpt6",
  "lpt7",
  "lpt8",
  "lpt9",
]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMOJI_PATTERN = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u;

export function isValidProfileId(value: unknown): value is ProfileId {
  if (typeof value !== "string") return false;
  if (value.length < 1 || value.length > 64) return false;
  if (!PROFILE_ID_PATTERN.test(value)) return false;
  if (value === "." || value === ".." || value.includes("/") || value.includes("\\")) return false;
  return !RESERVED_PROFILE_IDS.has(value);
}

export function validateProfileId(value: unknown): ProfileId {
  if (!isValidProfileId(value)) {
    throw new Error("Invalid profile id");
  }
  return value;
}

export function validateProfileName(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("Invalid profile name");
  }

  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 80) {
    throw new Error("Invalid profile name");
  }

  return trimmed;
}

export function assertUniqueProfileName(
  name: string,
  profiles: Pick<ProfileSummary, "id" | "name">[],
  currentProfileId?: ProfileId,
): void {
  const normalized = normalizeProfileName(name);
  const duplicate = profiles.find(
    (profile) =>
      profile.id !== currentProfileId &&
      normalizeProfileName(profile.name) === normalized,
  );

  if (duplicate) {
    throw new Error(`Profile name '${name.trim()}' already exists`);
  }
}

export function validateProfileAvatarEmoji(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("Invalid profile avatar");
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 16) {
    throw new Error("Invalid profile avatar");
  }

  const graphemes = splitGraphemes(trimmed);
  if (graphemes.length !== 1 || !EMOJI_PATTERN.test(trimmed)) {
    throw new Error("Invalid profile avatar");
  }

  return trimmed;
}

export function validateProfileEmail(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new Error("Invalid profile email");
  }

  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 254 || !EMAIL_PATTERN.test(trimmed)) {
    throw new Error("Invalid profile email");
  }

  return trimmed;
}

export function redactProfileManifest(manifest: ProfileManifest): ProfileSummary {
  return {
    id: manifest.id,
    name: manifest.name,
    avatarEmoji: manifest.avatarEmoji,
    email: manifest.email,
    passwordProtected: manifest.password.enabled,
  };
}

function normalizeProfileName(name: string): string {
  return validateProfileName(name).replace(/\s+/g, " ").toLocaleLowerCase();
}

function splitGraphemes(value: string): string[] {
  if (typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(value), (entry) => entry.segment);
  }

  return Array.from(value);
}
