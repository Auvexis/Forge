import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { resolveProfilePaths } from "../../profiles/profile-paths.ts";
import { PluginBlueprintRepository } from "./plugin-blueprint-repository.ts";
import type { PluginBlueprint } from "./plugin-blueprint-types.ts";

function createBlueprint(id = "bp_my_crm"): PluginBlueprint {
  return {
    id,
    metadata: {
      handle: "my-crm",
      name: "My CRM",
      version: "0.1.0",
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

function createRepository() {
  const sailorHome = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-plugin-creator-repo-"));
  const profilePaths = resolveProfilePaths({ sailorHome, profileId: "default" });
  return {
    sailorHome,
    profilePaths,
    repository: new PluginBlueprintRepository(profilePaths),
  };
}

describe("PluginBlueprintRepository", () => {
  it("creates, lists, reads and updates blueprints", () => {
    const { repository } = createRepository();
    const blueprint = createBlueprint();

    repository.create(blueprint);
    assert.equal(repository.get("bp_my_crm")?.metadata.name, "My CRM");
    assert.deepEqual(repository.list().map((item) => item.id), ["bp_my_crm"]);

    const updated = {
      ...blueprint,
      metadata: { ...blueprint.metadata, name: "My CRM Updated" },
      updatedAt: "2026-05-20T01:00:00.000Z",
    };
    repository.update("bp_my_crm", updated);

    assert.equal(repository.get("bp_my_crm")?.metadata.name, "My CRM Updated");
  });

  it("returns null when a blueprint does not exist", () => {
    const { repository } = createRepository();

    assert.equal(repository.get("bp_missing"), null);
  });

  it("rejects invalid ids before touching disk", () => {
    const { repository } = createRepository();

    assert.throws(() => repository.get("../evil"), /Invalid plugin creator id/);
    assert.throws(() => repository.create(createBlueprint("../evil")), /Invalid plugin creator id/);
  });

  it("writes formatted JSON with a final newline", () => {
    const { profilePaths, repository } = createRepository();
    const blueprint = createBlueprint();

    const writtenPath = repository.create(blueprint);
    const contents = fs.readFileSync(writtenPath, "utf8");

    assert.equal(writtenPath, path.join(profilePaths.profileDir, "plugin-creator", "blueprints", "bp_my_crm", "blueprint.json"));
    assert.equal(contents.endsWith("\n"), true);
    assert.match(contents, /\n  "metadata": \{/);
  });

  it("rejects updates where body id differs from route id", () => {
    const { repository } = createRepository();
    repository.create(createBlueprint("bp_my_crm"));

    assert.throws(
      () => repository.update("bp_my_crm", createBlueprint("bp_other")),
      /Blueprint id mismatch/,
    );
  });
});
