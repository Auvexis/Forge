import childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { ResolvedPluginInstallSource } from "./types.ts";

export interface FolderCopyOptions {
  allowedRelativePaths?: string[];
  maxBytes?: number;
  maxFiles?: number;
}

export interface RepositoryResolveOptions {
  timeoutMs?: number;
  execFile?: typeof childProcess.execFileSync;
}

const DEFAULT_MAX_BYTES = 50 * 1024 * 1024;
const DEFAULT_MAX_FILES = 5_000;

function createCacheFolder(cacheRoot: string, kind: "folders" | "downloads"): string {
  const destination = path.join(cacheRoot, kind, randomUUID());
  fs.mkdirSync(destination, { recursive: true });
  return destination;
}

function assertRelativePath(relativePath: string): void {
  if (path.isAbsolute(relativePath)) {
    throw new Error("Absolute paths are not allowed in plugin folder uploads");
  }

  const normalized = path.normalize(relativePath);
  if (normalized === ".." || normalized.startsWith(`..${path.sep}`)) {
    throw new Error("Path traversal is not allowed in plugin folder uploads");
  }
}

function assertInside(baseRealPath: string, targetPath: string, message: string): void {
  const targetRealPath = fs.realpathSync(targetPath);
  const relative = path.relative(baseRealPath, targetRealPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(message);
  }
}

function copyFile(sourceFile: string, destinationFile: string): number {
  fs.mkdirSync(path.dirname(destinationFile), { recursive: true });
  fs.copyFileSync(sourceFile, destinationFile);
  return fs.statSync(sourceFile).size;
}

export function copyExtractedFolderToCache(
  sourceFolder: string,
  cacheRoot: string,
  options: FolderCopyOptions = {},
): ResolvedPluginInstallSource {
  const sourceRealPath = fs.realpathSync(sourceFolder);
  const destination = createCacheFolder(cacheRoot, "folders");
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
  let copiedBytes = 0;
  let copiedFiles = 0;

  const copyOne = (relativePath: string) => {
    assertRelativePath(relativePath);
    const sourcePath = path.join(sourceRealPath, relativePath);
    if (!fs.existsSync(sourcePath)) return;

    const stat = fs.lstatSync(sourcePath);
    if (stat.isSymbolicLink()) {
      assertInside(sourceRealPath, sourcePath, "Folder symlink escapes selected folder");
    }

    if (stat.isDirectory()) {
      walk(relativePath);
      return;
    }

    if (!stat.isFile()) return;

    copiedFiles += 1;
    if (copiedFiles > maxFiles) {
      throw new Error("Plugin folder file count limit exceeded");
    }

    copiedBytes += copyFile(sourcePath, path.join(destination, relativePath));
    if (copiedBytes > maxBytes) {
      throw new Error("Plugin folder size limit exceeded");
    }
  };

  const walk = (relativeDir: string) => {
    assertRelativePath(relativeDir);
    const sourceDir = path.join(sourceRealPath, relativeDir);
    assertInside(sourceRealPath, sourceDir, "Folder path escapes selected folder");

    for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
      copyOne(path.join(relativeDir, entry.name));
    }
  };

  const allowed = options.allowedRelativePaths;
  if (allowed) {
    for (const relativePath of allowed) {
      copyOne(relativePath);
    }
  } else {
    walk("");
  }

  return {
    sourceType: "extracted_folder",
    localPath: destination,
    metadata: {
      type: "extracted_folder",
      originalValue: sourceFolder,
      cachedAt: new Date().toISOString(),
    },
  };
}

export function validateRepositoryUrl(repositoryUrl: string): URL {
  const parsed = new URL(repositoryUrl);
  if (parsed.protocol !== "https:") {
    throw new Error("Only HTTPS repository URLs are allowed");
  }

  if (!["github.com", "www.github.com"].includes(parsed.hostname.toLowerCase())) {
    throw new Error("Only GitHub HTTPS repository URLs are allowed in this alpha");
  }

  return parsed;
}

export function resolveRepositoryUrlToCache(
  repositoryUrl: string,
  cacheRoot: string,
  options: RepositoryResolveOptions = {},
): ResolvedPluginInstallSource {
  validateRepositoryUrl(repositoryUrl);
  const destination = createCacheFolder(cacheRoot, "downloads");
  const execFile = options.execFile ?? childProcess.execFileSync;

  execFile("git", ["clone", "--depth", "1", repositoryUrl, destination], {
    stdio: "pipe",
    timeout: options.timeoutMs ?? 30_000,
  });

  return {
    sourceType: "repository_url",
    localPath: destination,
    metadata: {
      type: "repository_url",
      originalValue: repositoryUrl,
      cachedAt: new Date().toISOString(),
    },
  };
}
