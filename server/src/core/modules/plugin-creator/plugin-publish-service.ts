import fs from "node:fs";
import path from "node:path";

import type { ProfilePaths } from "../../profiles/profile-paths.ts";
import type { PluginBlueprintRepository } from "./plugin-blueprint-repository.ts";
import type { PluginCreatorRelease } from "./plugin-blueprint-types.ts";
import { parsePluginBlueprint, validatePluginCreatorId } from "./plugin-blueprint-validation.ts";
import { generateCompletePlugin } from "./plugin-code-generator.ts";
import { resolveBlueprintPaths } from "./plugin-creator-paths.ts";
import type { PluginVersionService } from "./plugin-version-service.ts";

export interface PluginPublishServiceDependencies {
  profilePaths: ProfilePaths;
  repository: PluginBlueprintRepository;
  versionService: PluginVersionService;
  now?: () => string;
}

export interface PluginPublishOptions {
  allowOverwriteCustom?: boolean;
}

export class PluginPublishService {
  private readonly profilePaths: ProfilePaths;
  private readonly repository: PluginBlueprintRepository;
  private readonly versionService: PluginVersionService;
  private readonly now: () => string;

  constructor(dependencies: PluginPublishServiceDependencies) {
    this.profilePaths = dependencies.profilePaths;
    this.repository = dependencies.repository;
    this.versionService = dependencies.versionService;
    this.now = dependencies.now ?? (() => new Date().toISOString());
  }

  publish(blueprintId: string, options: PluginPublishOptions = {}): PluginCreatorRelease {
    const validBlueprintId = validatePluginCreatorId(blueprintId);
    const blueprint = this.repository.get(validBlueprintId);
    if (!blueprint) {
      throw new Error("blueprint_not_found");
    }

    const validBlueprint = parsePluginBlueprint(blueprint);
    const paths = resolveBlueprintPaths(this.profilePaths, validBlueprint.id);
    const releaseDir = paths.releaseDir(validBlueprint.metadata.version);

    if (fs.existsSync(releaseDir) && !options.allowOverwriteCustom && !isLowCodeRelease(releaseDir)) {
      throw new Error("custom_release_exists");
    }

    const snapshot = this.versionService.createSnapshot(validBlueprint, "pre-publish");
    const generated = generateCompletePlugin({
      profilePaths: this.profilePaths,
      blueprint: validBlueprint,
    });

    fs.rmSync(releaseDir, { recursive: true, force: true });
    copyDirectory(generated.generatedDir, releaseDir);

    return {
      id: `rel_${validBlueprint.id}_${validBlueprint.metadata.version.replaceAll(".", "_")}`,
      blueprintId: validBlueprint.id,
      version: validBlueprint.metadata.version,
      createdAt: this.now(),
      releaseDir,
      snapshotId: snapshot.id,
    };
  }
}

function isLowCodeRelease(releaseDir: string): boolean {
  const manifestPath = path.join(releaseDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    return false;
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
    return manifest["x-created-by"] === "sailor-plugin-creator" && manifest["x-editable-low-code"] === true;
  } catch {
    return false;
  }
}

function copyDirectory(sourceDir: string, targetDir: string): void {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
      continue;
    }
    fs.copyFileSync(sourcePath, targetPath);
  }
}
