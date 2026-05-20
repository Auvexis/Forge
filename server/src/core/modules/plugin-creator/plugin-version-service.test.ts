import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { resolveProfilePaths } from "../../profiles/profile-paths.ts";
import { PluginBlueprintRepository } from "./plugin-blueprint-repository.ts";
import type { PluginBlueprint, PluginCreatorSnapshotReason } from "./plugin-blueprint-types.ts";
import { PluginVersionService } from "./plugin-version-service.ts";

function createBlueprint(name = "My CRM", version = "0.1.0"): PluginBlueprint {
  return {
    id: "bp_my_crm",
    metadata: {
      handle: "my-crm",
      name,
      version,
      description: "CRM API connector",
    },
    icons: {},
    auth: { type: "none", fields: [] },
    methods: [],
    canvas: { nodes: {}, edges: [] },
    createdAt: "2026-05-20T00:00:00.000Z",
    updatedAt: "2026-05-20T00:00:00.000Z",
  };
}

function createService() {
  const sailorHome = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-plugin-version-service-"));
  const profilePaths = resolveProfilePaths({ sailorHome, profileId: "default" });
  const repository = new PluginBlueprintRepository(profilePaths);
  let id = 0;
  let minute = 0;
  return {
    repository,
    service: new PluginVersionService({
      profilePaths,
      repository,
      createId: () => `snap_${String(++id).padStart(3, "0")}`,
      now: () => `2026-05-20T00:${String(minute++).padStart(2, "0")}:00.000Z`,
    }),
  };
}

describe("PluginVersionService", () => {
  it("creates manual-save, pre-publish and rollback-point snapshots", () => {
    const { service } = createService();
    const reasons: PluginCreatorSnapshotReason[] = ["manual-save", "pre-publish", "rollback-point"];

    for (const reason of reasons) {
      const snapshot = service.createSnapshot(createBlueprint(), reason);
      assert.equal(snapshot.reason, reason);
      assert.equal(snapshot.blueprintId, "bp_my_crm");
      assert.equal(snapshot.version, "0.1.0");
      assert.equal(snapshot.blueprint.metadata.name, "My CRM");
    }

    assert.deepEqual(service.listSnapshots("bp_my_crm").map((snapshot) => snapshot.reason), reasons);
  });

  it("keeps only the 50 most recent non-publish snapshots", () => {
    const { service } = createService();

    service.createSnapshot(createBlueprint("Published"), "pre-publish");
    for (let index = 0; index < 55; index += 1) {
      service.createSnapshot(createBlueprint(`Draft ${index}`), "manual-save");
    }

    const snapshots = service.listSnapshots("bp_my_crm");
    const manualSnapshots = snapshots.filter((snapshot) => snapshot.reason === "manual-save");

    assert.equal(snapshots.some((snapshot) => snapshot.reason === "pre-publish"), true);
    assert.equal(manualSnapshots.length, 50);
    assert.equal(manualSnapshots[0]?.blueprint.metadata.name, "Draft 5");
    assert.equal(manualSnapshots.at(-1)?.blueprint.metadata.name, "Draft 54");
  });

  it("rolls back a blueprint from a snapshot and keeps a rollback-point", () => {
    const { repository, service } = createService();
    const original = createBlueprint("Original");
    repository.create(original);
    const snapshot = service.createSnapshot(original, "manual-save");
    repository.update("bp_my_crm", createBlueprint("Broken"));

    const restored = service.rollback("bp_my_crm", snapshot.id);

    assert.equal(restored.metadata.name, "Original");
    assert.equal(repository.get("bp_my_crm")?.metadata.name, "Original");
    assert.equal(
      service.listSnapshots("bp_my_crm").some((candidate) => candidate.reason === "rollback-point" && candidate.blueprint.metadata.name === "Broken"),
      true,
    );
  });
});
