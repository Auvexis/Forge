import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import {
  resolveProfilePaths,
  resolveProfilesRoot,
} from "./profile-paths.ts";

describe("profile path resolver", () => {
  it("resolves profile-owned paths under SAILOR_HOME profiles", () => {
    const sailorHome = path.join("C:", "Users", "tester", "AppData", "Roaming", "Sailor");
    const paths = resolveProfilePaths({ sailorHome, profileId: "default" });
    const root = path.resolve(sailorHome, "profiles");

    assert.equal(paths.profilesDir, root);
    assert.equal(paths.profileDir, path.join(root, "default"));
    assert.equal(paths.profileManifestPath, path.join(root, "default", "profile.json"));
    assert.equal(paths.pluginSettingsPath, path.join(root, "default", "plugin-settings.json"));
    assert.equal(paths.dataDir, path.join(root, "default", "data"));
    assert.equal(paths.appDbPath, path.join(root, "default", "data", "app.db"));
    assert.equal(paths.workflowsDbPath, path.join(root, "default", "data", "workflows.db"));
    assert.equal(paths.pluginsDbPath, path.join(root, "default", "data", "plugins.db"));
    assert.equal(paths.credentialsDbPath, path.join(root, "default", "data", "credentials.db"));
  });

  it("resolves profiles root without needing a profile id", () => {
    const sailorHome = path.join("C:", "SailorHome");
    assert.equal(resolveProfilesRoot(sailorHome), path.resolve(sailorHome, "profiles"));
  });

  it("rejects traversal and reserved profile ids before building paths", () => {
    const sailorHome = path.join("C:", "SailorHome");

    for (const profileId of ["..", "../evil", "evil/path", "con"]) {
      assert.throws(
        () => resolveProfilePaths({ sailorHome, profileId }),
        /Invalid profile id/,
      );
    }
  });

  it("rejects resolved paths that escape the profiles root", () => {
    const profilesDir = path.resolve("C:", "SailorHome", "profiles");
    assert.throws(
      () => resolveProfilePaths({ profilesDir, profileId: "default", profileDirOverride: path.dirname(profilesDir) }),
      /outside profiles root/,
    );
  });
});
