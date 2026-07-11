import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import {
  resolveProfilePaths,
  resolveProfilesRoot,
} from "./profile-paths.ts";

describe("profile path resolver", () => {
  it("resolves profile-owned paths under FABRIC_HOME profiles", () => {
    const fabricHome = path.join("C:", "Users", "tester", "AppData", "Roaming", "Fabric");
    const paths = resolveProfilePaths({ fabricHome, profileId: "default" });
    const root = path.resolve(fabricHome, "profiles");

    assert.equal(paths.profilesDir, root);
    assert.equal(paths.profileDir, path.join(root, "default"));
    assert.equal(paths.profileManifestPath, path.join(root, "default", "profile.json"));
    assert.equal(paths.pluginSettingsPath, path.join(root, "default", "plugin-settings.json"));
    assert.equal(paths.dataDir, path.join(root, "default", "data"));
    assert.equal(paths.appDbPath, path.join(root, "default", "data", "app.db"));
    assert.equal(paths.workflowsDbPath, path.join(root, "default", "data", "workflows.db"));
    assert.equal(paths.pluginsDbPath, path.join(root, "default", "data", "plugins.db"));
    assert.equal(paths.credentialsDbPath, path.join(root, "default", "data", "credentials.db"));
    assert.equal(paths.notificationsDbPath, path.join(root, "default", "data", "notifications.db"));
  });

  it("resolves profiles root without needing a profile id", () => {
    const fabricHome = path.join("C:", "FabricHome");
    assert.equal(resolveProfilesRoot(fabricHome), path.resolve(fabricHome, "profiles"));
  });

  it("rejects traversal and reserved profile ids before building paths", () => {
    const fabricHome = path.join("C:", "FabricHome");

    for (const profileId of ["..", "../evil", "evil/path", "con"]) {
      assert.throws(
        () => resolveProfilePaths({ fabricHome, profileId }),
        /Invalid profile id/,
      );
    }
  });

  it("rejects resolved paths that escape the profiles root", () => {
    const profilesDir = path.resolve("C:", "FabricHome", "profiles");
    assert.throws(
      () => resolveProfilePaths({ profilesDir, profileId: "default", profileDirOverride: path.dirname(profilesDir) }),
      /outside profiles root/,
    );
  });
});
