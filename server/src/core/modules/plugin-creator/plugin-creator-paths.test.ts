import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { resolveProfilePaths } from "../../profiles/profile-paths.ts";
import {
  assertInsidePluginCreatorRoot,
  resolveBlueprintPaths,
  resolvePluginCreatorProfilePaths,
} from "./plugin-creator-paths.ts";

describe("plugin creator path resolver", () => {
  it("resolves plugin creator roots under the active profile", () => {
    const profilePaths = resolveProfilePaths({
      sailorHome: path.join("C:", "SailorHome"),
      profileId: "default",
    });

    const paths = resolvePluginCreatorProfilePaths(profilePaths);

    assert.equal(paths.rootDir, path.join(profilePaths.profileDir, "plugin-creator"));
    assert.equal(paths.blueprintsDir, path.join(profilePaths.profileDir, "plugin-creator", "blueprints"));
    assert.equal(paths.exportsDir, path.join(profilePaths.profileDir, "plugin-creator", "exports"));
    assert.equal(paths.rootDir.includes(`${path.sep}global${path.sep}`), false);
  });

  it("resolves blueprint-owned folders below the plugin creator root", () => {
    const profilePaths = resolveProfilePaths({
      sailorHome: path.join("C:", "SailorHome"),
      profileId: "work",
    });

    const paths = resolveBlueprintPaths(profilePaths, "bp_my_crm");

    assert.equal(
      paths.blueprintDir,
      path.join(profilePaths.profileDir, "plugin-creator", "blueprints", "bp_my_crm"),
    );
    assert.equal(paths.blueprintPath, path.join(paths.blueprintDir, "blueprint.json"));
    assert.equal(paths.assetsDir, path.join(paths.blueprintDir, "assets"));
    assert.equal(paths.generatedDir, path.join(paths.blueprintDir, "generated"));
    assert.equal(paths.testsDir, path.join(paths.blueprintDir, "tests"));
    assert.equal(paths.lastRunPath, path.join(paths.testsDir, "last-run.json"));
    assert.equal(paths.snapshotsDir, path.join(paths.blueprintDir, "snapshots"));
    assert.equal(paths.releasesDir, path.join(paths.blueprintDir, "releases"));
    assert.equal(paths.releaseDir("0.1.0"), path.join(paths.releasesDir, "0.1.0"));
    assert.equal(paths.exportZipPath("0.1.0"), path.join(paths.exportsDir, "0.1.0.zip"));
  });

  it("rejects traversal blueprint ids", () => {
    const profilePaths = resolveProfilePaths({
      sailorHome: path.join("C:", "SailorHome"),
      profileId: "default",
    });

    assert.throws(() => resolveBlueprintPaths(profilePaths, "../evil"), /Invalid plugin creator id/);
    assert.throws(() => resolveBlueprintPaths(profilePaths, "bp/evil"), /Invalid plugin creator id/);
  });

  it("rejects targets outside the plugin creator root", () => {
    const root = path.resolve("C:", "SailorHome", "profiles", "default", "plugin-creator");

    assert.equal(assertInsidePluginCreatorRoot(root, path.join(root, "blueprints", "bp_1")), undefined);
    assert.throws(
      () => assertInsidePluginCreatorRoot(root, path.resolve("C:", "SailorHome", "global", "plugins")),
      /outside plugin creator root/,
    );
  });
});
