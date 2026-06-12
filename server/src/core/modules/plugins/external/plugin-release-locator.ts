import fs from "node:fs";
import path from "node:path";
import type { LocatedPluginRelease } from "./types.ts";

const REQUIRED_RELEASE_FILES = ["manifest.json", "index.js", "methods.js", "package.json", "package-lock.json"] as const;

function hasRequiredReleaseFiles(dir: string): boolean {
  return REQUIRED_RELEASE_FILES.every((file) => {
    const filePath = path.join(dir, file);
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  });
}

function hasAnyRequiredReleaseFile(dir: string): boolean {
  return REQUIRED_RELEASE_FILES.some((file) => {
    const filePath = path.join(dir, file);
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  });
}

function assertInside(baseDir: string, targetPath: string): void {
  const relative = path.relative(baseDir, targetPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Release path escapes selected folder: ${targetPath}`);
  }
}

function findReleaseDirs(rootDir: string): string[] {
  const releaseDirs: string[] = [];
  const rootRealPath = fs.realpathSync(rootDir);

  if (hasRequiredReleaseFiles(rootDir)) {
    return [rootDir];
  }

  const walk = (currentDir: string) => {
    assertInside(rootRealPath, fs.realpathSync(currentDir));
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (!entry.isDirectory()) continue;

      if (entry.name === "release" && hasAnyRequiredReleaseFile(fullPath)) {
        releaseDirs.push(fullPath);
        continue;
      }

      if (hasRequiredReleaseFiles(fullPath)) {
        releaseDirs.push(fullPath);
        continue;
      }

      walk(fullPath);
    }
  };

  walk(rootDir);
  return releaseDirs;
}

export function locatePluginRelease(rootDir: string): LocatedPluginRelease {
  if (!fs.existsSync(rootDir) || !fs.statSync(rootDir).isDirectory()) {
    throw new Error("Plugin source folder was not found");
  }

  const releaseDirs = findReleaseDirs(rootDir);
  if (releaseDirs.length === 0) {
    throw new Error("Required release directory was not found");
  }

  if (releaseDirs.length > 1) {
    throw new Error("Ambiguous plugin source: more than one release directory was found");
  }

  const releaseDir = releaseDirs[0];
  for (const file of REQUIRED_RELEASE_FILES) {
    const filePath = path.join(releaseDir, file);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      throw new Error(`Required release file is missing: ${file}`);
    }
  }

  return {
    releaseDir,
    manifestPath: path.join(releaseDir, "manifest.json"),
    entrypointPath: path.join(releaseDir, "index.js"),
    methodsPath: path.join(releaseDir, "methods.js"),
    packageJsonPath: path.join(releaseDir, "package.json"),
    packageLockPath: path.join(releaseDir, "package-lock.json"),
  };
}
