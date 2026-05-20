import path from "node:path";

import type { ProfilePaths } from "../../profiles/profile-paths.ts";
import { validatePluginCreatorId } from "./plugin-blueprint-validation.ts";

export interface PluginCreatorProfilePaths {
  rootDir: string;
  blueprintsDir: string;
  exportsDir: string;
}

export interface PluginCreatorBlueprintPaths {
  rootDir: string;
  blueprintsDir: string;
  exportsDir: string;
  blueprintDir: string;
  blueprintPath: string;
  assetsDir: string;
  generatedDir: string;
  testsDir: string;
  lastRunPath: string;
  snapshotsDir: string;
  releasesDir: string;
  releaseDir: (version: string) => string;
  exportZipPath: (version: string) => string;
}

export function resolvePluginCreatorProfilePaths(profilePaths: ProfilePaths): PluginCreatorProfilePaths {
  const rootDir = path.join(profilePaths.profileDir, "plugin-creator");
  return {
    rootDir,
    blueprintsDir: path.join(rootDir, "blueprints"),
    exportsDir: path.join(rootDir, "exports"),
  };
}

export function resolveBlueprintPaths(
  profilePaths: ProfilePaths,
  blueprintId: string,
): PluginCreatorBlueprintPaths {
  const validBlueprintId = validatePluginCreatorId(blueprintId);
  const profileCreatorPaths = resolvePluginCreatorProfilePaths(profilePaths);
  const blueprintDir = path.join(profileCreatorPaths.blueprintsDir, validBlueprintId);

  assertInsidePluginCreatorRoot(profileCreatorPaths.rootDir, blueprintDir);

  const testsDir = path.join(blueprintDir, "tests");
  const releasesDir = path.join(blueprintDir, "releases");
  return {
    ...profileCreatorPaths,
    blueprintDir,
    blueprintPath: path.join(blueprintDir, "blueprint.json"),
    assetsDir: path.join(blueprintDir, "assets"),
    generatedDir: path.join(blueprintDir, "generated"),
    testsDir,
    lastRunPath: path.join(testsDir, "last-run.json"),
    snapshotsDir: path.join(blueprintDir, "snapshots"),
    releasesDir,
    releaseDir(version: string): string {
      const releaseDir = path.join(releasesDir, version);
      assertInsidePluginCreatorRoot(profileCreatorPaths.rootDir, releaseDir);
      return releaseDir;
    },
    exportZipPath(version: string): string {
      const exportPath = path.join(profileCreatorPaths.exportsDir, `${version}.zip`);
      assertInsidePluginCreatorRoot(profileCreatorPaths.rootDir, exportPath);
      return exportPath;
    },
  };
}

export function assertInsidePluginCreatorRoot(rootDir: string, targetPath: string): void {
  const root = path.resolve(rootDir);
  const target = path.resolve(targetPath);
  const relative = path.relative(root, target);

  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    return;
  }

  throw new Error("Resolved plugin creator path is outside plugin creator root");
}
