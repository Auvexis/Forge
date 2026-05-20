import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { ProfilePaths } from "../../profiles/profile-paths.ts";
import type { PluginBlueprintRepository } from "./plugin-blueprint-repository.ts";
import type {
  PluginBlueprint,
  PluginCreatorSnapshot,
  PluginCreatorSnapshotReason,
} from "./plugin-blueprint-types.ts";
import { validatePluginCreatorId } from "./plugin-blueprint-validation.ts";
import { resolveBlueprintPaths } from "./plugin-creator-paths.ts";

export interface PluginVersionServiceDependencies {
  profilePaths: ProfilePaths;
  repository: PluginBlueprintRepository;
  createId?: () => string;
  now?: () => string;
  maxCommonSnapshots?: number;
}

const commonSnapshotReasons = new Set<PluginCreatorSnapshotReason>([
  "manual-save",
  "rollback-point",
  "autosave",
]);

export class PluginVersionService {
  private readonly profilePaths: ProfilePaths;
  private readonly repository: PluginBlueprintRepository;
  private readonly createId: () => string;
  private readonly now: () => string;
  private readonly maxCommonSnapshots: number;

  constructor(dependencies: PluginVersionServiceDependencies) {
    this.profilePaths = dependencies.profilePaths;
    this.repository = dependencies.repository;
    this.createId = dependencies.createId ?? (() => `snap_${randomUUID()}`);
    this.now = dependencies.now ?? (() => new Date().toISOString());
    this.maxCommonSnapshots = dependencies.maxCommonSnapshots ?? 50;
  }

  createSnapshot(blueprint: PluginBlueprint, reason: PluginCreatorSnapshotReason): PluginCreatorSnapshot {
    const snapshot: PluginCreatorSnapshot = {
      id: validateSnapshotId(this.createId()),
      blueprintId: validatePluginCreatorId(blueprint.id),
      createdAt: this.now(),
      reason,
      version: blueprint.metadata.version,
      blueprint,
    };

    const paths = resolveBlueprintPaths(this.profilePaths, blueprint.id);
    fs.mkdirSync(paths.snapshotsDir, { recursive: true });
    writeJsonFile(path.join(paths.snapshotsDir, `${snapshot.id}.json`), snapshot);
    this.pruneCommonSnapshots(blueprint.id);
    return snapshot;
  }

  listSnapshots(blueprintId: string): PluginCreatorSnapshot[] {
    const paths = resolveBlueprintPaths(this.profilePaths, validatePluginCreatorId(blueprintId));
    if (!fs.existsSync(paths.snapshotsDir)) {
      return [];
    }

    return fs
      .readdirSync(paths.snapshotsDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => readSnapshot(path.join(paths.snapshotsDir, entry.name)))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  rollback(blueprintId: string, snapshotId: string): PluginBlueprint {
    const validBlueprintId = validatePluginCreatorId(blueprintId);
    const snapshot = this.listSnapshots(validBlueprintId).find(
      (candidate) => candidate.id === validateSnapshotId(snapshotId),
    );
    if (!snapshot) {
      throw new Error("snapshot_not_found");
    }

    const current = this.repository.get(validBlueprintId);
    if (!current) {
      throw new Error("blueprint_not_found");
    }

    this.createSnapshot(current, "rollback-point");
    this.repository.update(validBlueprintId, snapshot.blueprint);

    const restored = this.repository.get(validBlueprintId);
    if (!restored) {
      throw new Error("Blueprint rollback failed");
    }

    return restored;
  }

  private pruneCommonSnapshots(blueprintId: string): void {
    const commonSnapshots = this.listSnapshots(blueprintId).filter((snapshot) =>
      commonSnapshotReasons.has(snapshot.reason),
    );
    const staleSnapshots = commonSnapshots.slice(0, Math.max(0, commonSnapshots.length - this.maxCommonSnapshots));

    const paths = resolveBlueprintPaths(this.profilePaths, blueprintId);
    for (const snapshot of staleSnapshots) {
      fs.rmSync(path.join(paths.snapshotsDir, `${snapshot.id}.json`), { force: true });
    }
  }
}

function validateSnapshotId(id: string): string {
  if (!/^snap_[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error("Invalid plugin creator snapshot id");
  }
  return id;
}

function readSnapshot(filePath: string): PluginCreatorSnapshot {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as PluginCreatorSnapshot;
}

function writeJsonFile(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
