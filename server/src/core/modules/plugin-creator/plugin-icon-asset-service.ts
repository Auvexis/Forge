import fs from "node:fs";
import path from "node:path";

import type { ProfilePaths } from "../../profiles/profile-paths.ts";
import type { PluginBlueprintIcons } from "./plugin-blueprint-types.ts";
import { resolveBlueprintPaths } from "./plugin-creator-paths.ts";

export type PluginBlueprintIconSlot = keyof PluginBlueprintIcons;

export interface SavePluginIconAssetInput {
  profilePaths: ProfilePaths;
  blueprintId: string;
  slot: PluginBlueprintIconSlot;
  filename: string;
  buffer: Buffer;
}

const allowedSlots = new Set<PluginBlueprintIconSlot>(["icon", "iconDark", "iconLight"]);
const allowedExtensions = new Set([".svg", ".png", ".webp", ".jpg", ".jpeg"]);

export function savePluginIconAsset(input: SavePluginIconAssetInput): string {
  if (!allowedSlots.has(input.slot)) {
    throw new Error("Invalid plugin icon asset slot");
  }

  const extension = validateIconFilename(input.filename);
  const paths = resolveBlueprintPaths(input.profilePaths, input.blueprintId);
  const relativePath = `assets/icons/${input.slot}${extension}`;
  const targetPath = path.join(paths.assetsDir, "icons", `${input.slot}${extension}`);

  assertInsideBlueprintAssets(paths.assetsDir, targetPath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, input.buffer);

  return relativePath;
}

export function validatePluginIconAssetPath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (isExternalIconValue(trimmed)) return trimmed;
  if (trimmed.startsWith("file://") || path.isAbsolute(trimmed) || /^[a-zA-Z]:[\\/]/.test(trimmed)) {
    throw new Error("Invalid plugin icon asset path");
  }

  const normalized = trimmed.replaceAll("\\", "/");
  if (normalized.split("/").includes("..")) {
    throw new Error("Invalid plugin icon asset path");
  }

  return normalized;
}

function validateIconFilename(filename: string): string {
  const normalized = filename.trim().replaceAll("\\", "/");
  if (
    !normalized ||
    normalized.startsWith("file://") ||
    normalized.includes("/") ||
    normalized.split("/").includes("..") ||
    path.isAbsolute(normalized) ||
    /^[a-zA-Z]:[\\/]/.test(filename)
  ) {
    throw new Error("Invalid plugin icon asset filename");
  }

  const extension = path.extname(normalized).toLowerCase();
  if (!allowedExtensions.has(extension)) {
    throw new Error("Invalid plugin icon asset extension");
  }

  return extension;
}

function isExternalIconValue(value: string): boolean {
  const normalized = value.toLowerCase();
  return normalized.startsWith("https://") || normalized.startsWith("http://") || normalized.startsWith("data:image/");
}

function assertInsideBlueprintAssets(assetsDir: string, targetPath: string): void {
  const relative = path.relative(path.resolve(assetsDir), path.resolve(targetPath));
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    return;
  }

  throw new Error("Invalid plugin icon asset path");
}
