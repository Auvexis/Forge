import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import {
  ensureFabricHomeStructure,
  resolveDefaultProfilePaths,
  resolveFabricHomePaths,
} from "./fabric-home.ts";

describe("resolveFabricHomePaths", () => {
  it("uses FABRIC_HOME env override and exposes named runtime paths", () => {
    const home = path.join(os.tmpdir(), "fabric-home-test");

    const paths = resolveFabricHomePaths({ env: { FABRIC_HOME: home } });

    assert.equal(paths.home, path.resolve(home));
    assert.equal(paths.dataDir, path.join(path.resolve(home), "data"));
    assert.equal(paths.globalDir, path.join(path.resolve(home), "global"));
    assert.equal(paths.globalPluginsDir, path.join(path.resolve(home), "global", "plugins"));
    assert.equal(paths.pluginCacheDir, path.join(path.resolve(home), "global", "plugin-cache"));
    assert.equal(paths.logsDir, path.join(path.resolve(home), "global", "logs"));
    assert.equal(paths.profilesDir, path.join(path.resolve(home), "profiles"));
    assert.equal(paths.profilesIndexPath, path.join(path.resolve(home), "profiles.json"));
    assert.equal(paths.defaultProfileDir, path.join(path.resolve(home), "profiles", "default"));
    assert.match(paths.internalPluginsDir, /server[\\/]src[\\/]plugins$/);
  });

  it("resolves OS defaults when FABRIC_HOME is not set", () => {
    const win = resolveFabricHomePaths({
      env: { APPDATA: "C:\\Users\\tester\\AppData\\Roaming" },
      platform: "win32",
      homeDir: "C:\\Users\\tester",
    });
    assert.equal(win.home, path.resolve("C:\\Users\\tester\\AppData\\Roaming", "Fabric"));

    const mac = resolveFabricHomePaths({
      env: {},
      platform: "darwin",
      homeDir: "/Users/tester",
    });
    assert.equal(mac.home, path.resolve("/Users/tester", "Library", "Application Support", "Fabric"));

    const linux = resolveFabricHomePaths({
      env: {},
      platform: "linux",
      homeDir: "/home/tester",
    });
    assert.equal(linux.home, path.resolve("/home/tester", ".config", "fabric"));
  });
});

describe("ensureFabricHomeStructure", () => {
  it("creates the runtime directory skeleton idempotently", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "fabric-home-"));
    const paths = resolveFabricHomePaths({ env: { FABRIC_HOME: home } });

    ensureFabricHomeStructure(paths);
    ensureFabricHomeStructure(paths);

    for (const dir of [
      paths.dataDir,
      paths.globalDir,
      paths.globalPluginsDir,
      paths.pluginCacheDir,
      paths.logsDir,
      paths.profilesDir,
      paths.defaultProfileDir,
      path.join(paths.defaultProfileDir, "data"),
    ]) {
      assert.equal(fs.statSync(dir).isDirectory(), true, `${dir} should exist`);
    }

    const profile = JSON.parse(
      fs.readFileSync(path.join(paths.defaultProfileDir, "profile.json"), "utf8"),
    );
    assert.equal(profile.id, "default");
    assert.equal(profile.name, "Default");
    assert.equal(profile.avatarEmoji, "⛵");
    assert.equal(profile.email, null);
    assert.equal(profile.password.enabled, false);

    const index = JSON.parse(fs.readFileSync(paths.profilesIndexPath, "utf8"));
    assert.deepEqual(index, {
      currentProfileId: "default",
      profileIds: ["default"],
    });

    const settings = JSON.parse(
      fs.readFileSync(path.join(paths.defaultProfileDir, "plugin-settings.json"), "utf8"),
    );
    assert.deepEqual(settings.enabledPlugins, []);
  });

  it("preserves existing default profile files on boot", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "fabric-home-existing-"));
    const paths = resolveFabricHomePaths({ env: { FABRIC_HOME: home } });
    fs.mkdirSync(paths.defaultProfileDir, { recursive: true });
    fs.writeFileSync(
      path.join(paths.defaultProfileDir, "profile.json"),
      `${JSON.stringify({
        id: "default",
        name: "Existing",
        avatarEmoji: "🧭",
        email: "existing@example.com",
        password: {
          enabled: false,
          hash: null,
          algorithm: null,
          createdAt: null,
          updatedAt: null,
        },
        createdAt: "2026-05-17T00:00:00.000Z",
        updatedAt: "2026-05-17T00:00:00.000Z",
      })}\n`,
    );

    ensureFabricHomeStructure(paths);

    const profile = JSON.parse(
      fs.readFileSync(path.join(paths.defaultProfileDir, "profile.json"), "utf8"),
    );
    assert.equal(profile.name, "Existing");
    assert.equal(profile.avatarEmoji, "🧭");
  });

  it("exposes active profile path helpers separately from global paths", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "fabric-home-profile-paths-"));
    const paths = resolveFabricHomePaths({ env: { FABRIC_HOME: home } });
    const profilePaths = resolveDefaultProfilePaths(paths);

    assert.equal(profilePaths.profileDir, paths.defaultProfileDir);
    assert.equal(profilePaths.dataDir, path.join(paths.defaultProfileDir, "data"));
    assert.equal(profilePaths.appDbPath, path.join(paths.defaultProfileDir, "data", "app.db"));
  });
});
