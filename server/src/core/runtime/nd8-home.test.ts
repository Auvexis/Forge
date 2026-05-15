import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import {
  ensureNd8HomeStructure,
  resolveNd8HomePaths,
} from "./nd8-home.ts";

describe("resolveNd8HomePaths", () => {
  it("uses ND8_HOME env override and exposes named runtime paths", () => {
    const home = path.join(os.tmpdir(), "nd8-home-test");

    const paths = resolveNd8HomePaths({ env: { ND8_HOME: home } });

    assert.equal(paths.home, path.resolve(home));
    assert.equal(paths.dataDir, path.join(path.resolve(home), "data"));
    assert.equal(paths.globalDir, path.join(path.resolve(home), "global"));
    assert.equal(paths.globalPluginsDir, path.join(path.resolve(home), "global", "plugins"));
    assert.equal(paths.pluginCacheDir, path.join(path.resolve(home), "global", "plugin-cache"));
    assert.equal(paths.logsDir, path.join(path.resolve(home), "global", "logs"));
    assert.equal(paths.profilesDir, path.join(path.resolve(home), "profiles"));
    assert.equal(paths.defaultProfileDir, path.join(path.resolve(home), "profiles", "default"));
    assert.match(paths.internalPluginsDir, /server[\\/]src[\\/]plugins$/);
  });

  it("resolves OS defaults when ND8_HOME is not set", () => {
    const win = resolveNd8HomePaths({
      env: { APPDATA: "C:\\Users\\tester\\AppData\\Roaming" },
      platform: "win32",
      homeDir: "C:\\Users\\tester",
    });
    assert.equal(win.home, path.resolve("C:\\Users\\tester\\AppData\\Roaming", "nd8"));

    const mac = resolveNd8HomePaths({
      env: {},
      platform: "darwin",
      homeDir: "/Users/tester",
    });
    assert.equal(mac.home, path.resolve("/Users/tester", "Library", "Application Support", "nd8"));

    const linux = resolveNd8HomePaths({
      env: {},
      platform: "linux",
      homeDir: "/home/tester",
    });
    assert.equal(linux.home, path.resolve("/home/tester", ".config", "nd8"));
  });
});

describe("ensureNd8HomeStructure", () => {
  it("creates the runtime directory skeleton idempotently", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "nd8-home-"));
    const paths = resolveNd8HomePaths({ env: { ND8_HOME: home } });

    ensureNd8HomeStructure(paths);
    ensureNd8HomeStructure(paths);

    for (const dir of [
      paths.dataDir,
      paths.globalDir,
      paths.globalPluginsDir,
      paths.pluginCacheDir,
      paths.logsDir,
      paths.profilesDir,
      paths.defaultProfileDir,
      path.join(paths.defaultProfileDir, "workflows"),
    ]) {
      assert.equal(fs.statSync(dir).isDirectory(), true, `${dir} should exist`);
    }

    const profile = JSON.parse(
      fs.readFileSync(path.join(paths.defaultProfileDir, "profile.json"), "utf8"),
    );
    assert.equal(profile.id, "default");
    assert.equal(profile.name, "Default");

    const settings = JSON.parse(
      fs.readFileSync(path.join(paths.defaultProfileDir, "plugin-settings.json"), "utf8"),
    );
    assert.deepEqual(settings.enabledPlugins, []);
  });
});
