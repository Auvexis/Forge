import fs from "node:fs";
import path from "node:path";

import { validateSiteProjectPath } from "./site-file-service.ts";
import type { SiteFile } from "./site-types.ts";

export interface SaveSiteAssetInput {
  storageRoot: string;
  profileId: string;
  siteId: string;
  filename: string;
  buffer: Buffer;
  mimeType: string;
}

const allowedAssetExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);

export function saveSiteAsset(input: SaveSiteAssetInput): SiteFile {
  const filename = validateAssetFilename(input.filename);
  const relativePath = validateSiteProjectPath(`assets/${filename}`);
  const targetPath = path.join(input.storageRoot, input.profileId, input.siteId, relativePath);
  assertInside(path.join(input.storageRoot, input.profileId, input.siteId, "assets"), targetPath);

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, input.buffer);

  return {
    path: relativePath,
    kind: "asset",
    mimeType: input.mimeType,
    size: input.buffer.byteLength,
    url: `/sites/${encodeURIComponent(input.siteId)}/assets/${encodeAssetPath(filename)}`,
    updatedAt: new Date().toISOString(),
  };
}

export function readSiteAsset(input: { storageRoot: string; profileId: string; siteId: string; assetPath: string }): Buffer | null {
  const relativePath = validateSiteProjectPath(`assets/${input.assetPath}`);
  const targetPath = path.join(input.storageRoot, input.profileId, input.siteId, relativePath);
  assertInside(path.join(input.storageRoot, input.profileId, input.siteId, "assets"), targetPath);
  if (!fs.existsSync(targetPath)) return null;
  return fs.readFileSync(targetPath);
}

function validateAssetFilename(filename: string): string {
  const normalized = filename.trim().replaceAll("\\", "/");
  if (
    !normalized ||
    normalized.startsWith("file://") ||
    normalized.startsWith("/") ||
    normalized.includes("/") ||
    normalized.split("/").includes("..") ||
    path.isAbsolute(normalized) ||
    /^[a-zA-Z]:[\\/]/.test(filename)
  ) {
    throw new Error("Invalid site asset filename");
  }

  const extension = path.extname(normalized).toLowerCase();
  if (!allowedAssetExtensions.has(extension)) {
    throw new Error("Invalid site asset extension");
  }

  return normalized;
}

function assertInside(root: string, target: string): void {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) return;
  throw new Error("Invalid site asset path");
}

function encodeAssetPath(assetPath: string): string {
  return assetPath.split("/").map(encodeURIComponent).join("/");
}
