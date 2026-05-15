import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

describe("DatabaseManager", () => {
  it("opens SQLite files under ND8_HOME/data", async () => {
    const previousNd8Home = process.env.ND8_HOME;
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "nd8-db-home-"));
    process.env.ND8_HOME = home;

    try {
      const mod = await import(`./manager.ts?home=${Date.now()}`);

      assert.equal(mod.getDatabaseDirectory(), path.join(home, "data"));

      for (const filename of ["app.db", "workflows.db", "plugins.db", "credentials.db"]) {
        assert.equal(fs.existsSync(path.join(home, "data", filename)), true);
      }

      mod.closeDatabases();
    } finally {
      if (previousNd8Home === undefined) {
        delete process.env.ND8_HOME;
      } else {
        process.env.ND8_HOME = previousNd8Home;
      }
    }
  });
});
