import fs from "node:fs";
import path from "node:path";

import type { ProfilePaths } from "../../profiles/profile-paths.ts";
import { resolveBlueprintPaths, resolvePluginCreatorProfilePaths } from "./plugin-creator-paths.ts";
import { parsePluginBlueprint, validatePluginCreatorId } from "./plugin-blueprint-validation.ts";
import type { PluginBlueprint } from "./plugin-blueprint-types.ts";

export class PluginBlueprintRepository {
  private readonly profilePaths: ProfilePaths;

  constructor(profilePaths: ProfilePaths) {
    this.profilePaths = profilePaths;
  }

  list(): PluginBlueprint[] {
    const paths = resolvePluginCreatorProfilePaths(this.profilePaths);
    if (!fs.existsSync(paths.blueprintsDir)) {
      return [];
    }

    return fs
      .readdirSync(paths.blueprintsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => this.get(entry.name))
      .filter((blueprint): blueprint is PluginBlueprint => blueprint !== null)
      .sort((left, right) => left.metadata.name.localeCompare(right.metadata.name));
  }

  get(id: string): PluginBlueprint | null {
    const paths = resolveBlueprintPaths(this.profilePaths, validatePluginCreatorId(id));
    if (!fs.existsSync(paths.blueprintPath)) {
      return null;
    }

    return parsePluginBlueprint(JSON.parse(fs.readFileSync(paths.blueprintPath, "utf8")));
  }

  create(blueprint: PluginBlueprint): string {
    validatePluginCreatorId(blueprint.id);
    const paths = resolveBlueprintPaths(this.profilePaths, blueprint.id);
    fs.mkdirSync(path.dirname(paths.blueprintPath), { recursive: true });
    writeJsonFile(paths.blueprintPath, parsePluginBlueprint(blueprint));
    return paths.blueprintPath;
  }

  update(id: string, blueprint: PluginBlueprint): string {
    const validId = validatePluginCreatorId(id);
    if (blueprint.id !== validId) {
      throw new Error("Blueprint id mismatch");
    }

    const paths = resolveBlueprintPaths(this.profilePaths, validId);
    fs.mkdirSync(path.dirname(paths.blueprintPath), { recursive: true });
    writeJsonFile(paths.blueprintPath, parsePluginBlueprint(blueprint));
    return paths.blueprintPath;
  }
}

function writeJsonFile(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
