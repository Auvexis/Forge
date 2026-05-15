import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { readPluginManifestPreview } from "./plugin-manifest-preview.ts";

const validManifest = {
  metadata: {
    id: "preview-plugin",
    name: "Preview Plugin",
    description: "Preview only",
    icon: "plug",
    category: "test",
    author: "ND8",
    version: "1.0.0",
    repository: "",
  },
  methods: {
    ping: {
      metadata: { label: "Ping", description: "Ping" },
      parameters: { type: "object", properties: {} },
      responseSchema: { type: "object", properties: {} },
      ui: { component: "form" },
    },
  },
};

describe("readPluginManifestPreview", () => {
  it("reads and validates manifest metadata without executing plugin code", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nd8-preview-"));
    const marker = path.join(dir, "executed.txt");
    fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(validManifest));
    fs.writeFileSync(path.join(dir, "index.js"), `import fs from "node:fs"; fs.writeFileSync(${JSON.stringify(marker)}, "ran");`);

    const preview = readPluginManifestPreview(path.join(dir, "manifest.json"));

    assert.equal(preview.valid, true);
    assert.equal(preview.manifest?.metadata.id, "preview-plugin");
    assert.deepEqual(preview.methodNames, ["ping"]);
    assert.equal(fs.existsSync(marker), false);
  });

  it("returns validation errors for invalid manifests", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nd8-preview-"));
    fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({ metadata: { id: "Bad ID" } }));

    const preview = readPluginManifestPreview(path.join(dir, "manifest.json"));

    assert.equal(preview.valid, false);
    assert.equal(preview.manifest, null);
    assert.match(preview.errors.join("\n"), /metadata.id must be kebab-case/);
    assert.match(preview.errors.join("\n"), /Missing or invalid 'methods' section/);
  });
});
