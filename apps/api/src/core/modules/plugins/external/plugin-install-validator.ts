import fs from "node:fs";
import path from "node:path";
import type { LocatedPluginRelease } from "./types.ts";

export interface PluginInstallValidationOptions {
  maxReleaseBytes?: number;
  maxFiles?: number;
}

const DEFAULT_MAX_RELEASE_BYTES = 50 * 1024 * 1024;
const DEFAULT_MAX_FILES = 5_000;

function assertInside(baseRealPath: string, targetPath: string): void {
  const targetRealPath = fs.realpathSync(targetPath);
  const relative = path.relative(baseRealPath, targetRealPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Release path escapes its folder: ${targetPath}`);
  }
}

export function validatePluginInstallRelease(
  release: LocatedPluginRelease,
  options: PluginInstallValidationOptions = {},
): void {
  for (const required of [
    release.manifestPath,
    release.entrypointPath,
    release.methodsPath,
    release.packageJsonPath,
    release.packageLockPath,
  ]) {
    if (!fs.existsSync(required) || !fs.statSync(required).isFile()) {
      throw new Error(`Required release file is missing: ${path.basename(required)}`);
    }
  }

  const releaseRealPath = fs.realpathSync(release.releaseDir);
  let totalBytes = 0;
  let totalFiles = 0;

  const walk = (currentDir: string) => {
    assertInside(releaseRealPath, currentDir);
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isSymbolicLink()) {
        assertInside(releaseRealPath, fullPath);
      }
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;

      totalFiles += 1;
      if (totalFiles > (options.maxFiles ?? DEFAULT_MAX_FILES)) {
        throw new Error("Release file count limit exceeded");
      }

      totalBytes += fs.statSync(fullPath).size;
      if (totalBytes > (options.maxReleaseBytes ?? DEFAULT_MAX_RELEASE_BYTES)) {
        throw new Error("Release size limit exceeded");
      }
    }
  };

  walk(release.releaseDir);
}
