import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { resolveProfilePaths } from "../../profiles/profile-paths.ts";
import { PluginCreatorEngine } from "./plugin-creator-engine.ts";
import { PluginBlueprintRepository } from "./plugin-blueprint-repository.ts";
import { PluginScaffoldService } from "./plugin-scaffold-service.ts";

function createEngine() {
  const sailorHome = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-plugin-creator-engine-"));
  const profilePaths = resolveProfilePaths({ sailorHome, profileId: "default" });
  return new PluginCreatorEngine({
    repository: new PluginBlueprintRepository(profilePaths),
    scaffold: new PluginScaffoldService({
      createId: (prefix) => `${prefix}_fixed`,
      now: () => "2026-05-20T00:00:00.000Z",
    }),
  });
}

describe("PluginCreatorEngine", () => {
  it("creates and lists blueprints", () => {
    const engine = createEngine();

    const created = engine.createBlueprint({
      handle: "my-crm",
      name: "My CRM",
      description: "CRM API connector",
    });

    assert.equal(created.id, "bp_fixed");
    assert.deepEqual(engine.listBlueprints().map((blueprint) => blueprint.id), ["bp_fixed"]);
  });

  it("gets and updates blueprints", () => {
    const engine = createEngine();
    const created = engine.createBlueprint({
      handle: "my-crm",
      name: "My CRM",
      description: "CRM API connector",
    });

    const updated = engine.updateBlueprint(created.id, {
      ...created,
      metadata: { ...created.metadata, name: "Updated CRM" },
      updatedAt: "2026-05-20T01:00:00.000Z",
    });

    assert.equal(updated.metadata.name, "Updated CRM");
    assert.equal(engine.getBlueprint(created.id)?.metadata.name, "Updated CRM");
  });

  it("returns null for missing blueprints", () => {
    const engine = createEngine();

    assert.equal(engine.getBlueprint("bp_missing"), null);
  });

  it("rejects route/body id mismatches on update", () => {
    const engine = createEngine();
    const created = engine.createBlueprint({
      handle: "my-crm",
      name: "My CRM",
      description: "CRM API connector",
    });

    assert.throws(
      () => engine.updateBlueprint("bp_other", created),
      /Blueprint id mismatch/,
    );
  });
});
