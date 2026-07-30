import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("plugin credential status", () => {
  it("refreshes list and selected plugin status immediately after save", () => {
    const source = readFileSync(
      new URL("../AppGlobalSettings.vue", import.meta.url),
      "utf8",
    );

    assert.match(
      source,
      /await store\.saveCredential\(pluginId, fields\)[\s\S]*await loadStatus\(\)/,
    );
    assert.match(source, /syncSelectedPluginStatus\(pluginStatus\.value\.status\)/);
    assert.match(source, /target\.status = status/);
    assert.match(source, /selectedPluginForMenu\.value\.status = status/);
  });
});
