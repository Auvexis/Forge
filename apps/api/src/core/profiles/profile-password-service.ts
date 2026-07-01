import crypto from "node:crypto";

import type { ProfileStore } from "./profile-store.ts";
import type { ProfileId, VerifyProfilePasswordInput } from "./profile-types.ts";

export interface ProfilePasswordServiceOptions {
  store: ProfileStore;
  clock?: () => Date;
}

const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_OPTIONS = {
  N: 16384,
  r: 8,
  p: 1,
} as const;

export class ProfilePasswordService {
  private readonly store: ProfileStore;
  private readonly clock: () => Date;

  constructor(options: ProfilePasswordServiceOptions) {
    this.store = options.store;
    this.clock = options.clock ?? (() => new Date());
  }

  setPassword(profileId: ProfileId, password: string): void {
    if (!password) {
      throw new Error("Profile password is required");
    }

    const now = this.clock().toISOString();
    const current = this.store.getProfileManifest(profileId);
    const createdAt = current?.password.createdAt ?? now;
    this.store.setPasswordMetadata(profileId, {
      enabled: true,
      hash: hashPassword(password),
      algorithm: "scrypt",
      createdAt,
      updatedAt: now,
    });
  }

  verifyPassword(input: VerifyProfilePasswordInput): boolean {
    const manifest = this.store.getProfileManifest(input.profileId);
    if (!manifest?.password.enabled || !manifest.password.hash) return false;
    return verifyPasswordHash(input.password, manifest.password.hash);
  }

  removePassword(profileId: ProfileId): void {
    this.store.clearPasswordMetadata(profileId);
  }
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEY_LENGTH, SCRYPT_OPTIONS);
  return [
    "scrypt",
    SCRYPT_OPTIONS.N,
    SCRYPT_OPTIONS.r,
    SCRYPT_OPTIONS.p,
    salt.toString("base64url"),
    hash.toString("base64url"),
  ].join("$");
}

function verifyPasswordHash(password: string, encodedHash: string): boolean {
  const parts = encodedHash.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, nValue, rValue, pValue, saltValue, hashValue] = parts;
  const expected = Buffer.from(hashValue, "base64url");
  const actual = crypto.scryptSync(
    password,
    Buffer.from(saltValue, "base64url"),
    expected.length,
    {
      N: Number(nValue),
      r: Number(rValue),
      p: Number(pValue),
    },
  );

  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}
