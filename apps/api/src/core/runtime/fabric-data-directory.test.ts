import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import {
  prepareFabricDataDirectory,
  resolveLegacyDataDir,
} from "./fabric-data-directory.ts";

describe("prepareFabricDataDirectory", () => {
  it("copies legacy config/data databases into an empty FABRIC_HOME data dir", () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "fabric-data-"));
    const dataDir = path.join(temp, "home", "data");
    const legacyDir = path.join(temp, "config", "data");
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(path.join(legacyDir, "app.db"), "legacy-app");
    fs.writeFileSync(path.join(legacyDir, "workflows.db"), "legacy-workflows");
    fs.writeFileSync(path.join(legacyDir, "notes.txt"), "ignore-me");

    const result = prepareFabricDataDirectory({ dataDir, legacyDataDir: legacyDir });

    assert.equal(result.copied, true);
    assert.deepEqual(result.files.sort(), ["app.db", "workflows.db"]);
    assert.equal(fs.readFileSync(path.join(dataDir, "app.db"), "utf8"), "legacy-app");
    assert.equal(fs.readFileSync(path.join(dataDir, "workflows.db"), "utf8"), "legacy-workflows");
    assert.equal(fs.existsSync(path.join(legacyDir, "app.db")), true);
    assert.equal(fs.existsSync(path.join(dataDir, "notes.txt")), false);
  });

  it("does not overwrite existing FABRIC_HOME data", () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "fabric-data-"));
    const dataDir = path.join(temp, "home", "data");
    const legacyDir = path.join(temp, "config", "data");
    fs.mkdirSync(dataDir, { recursive: true });
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, "app.db"), "new-app");
    fs.writeFileSync(path.join(legacyDir, "app.db"), "legacy-app");

    const result = prepareFabricDataDirectory({ dataDir, legacyDataDir: legacyDir });

    assert.equal(result.copied, false);
    assert.equal(result.reason, "target-not-empty");
    assert.equal(fs.readFileSync(path.join(dataDir, "app.db"), "utf8"), "new-app");
  });
});

describe("resolveLegacyDataDir", () => {
  it("points at the repository config/data directory", () => {
    assert.match(resolveLegacyDataDir(), /config[\\/]data$/);
  });
});
