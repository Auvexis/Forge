import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isRunnableMigrationFile } from "./migration-engine.ts";

describe("isRunnableMigrationFile", () => {
  it("accepts migration files and rejects test files", () => {
    assert.equal(isRunnableMigrationFile("001_initial_plugins.ts"), true);
    assert.equal(isRunnableMigrationFile("002_plugin_source_metadata.js"), true);
    assert.equal(isRunnableMigrationFile("002_plugin_source_metadata.test.ts"), false);
    assert.equal(isRunnableMigrationFile("helper.test.js"), false);
  });
});
