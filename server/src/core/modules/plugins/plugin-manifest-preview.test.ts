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
    author: "SAILOR",
    version: "1.0.0",
    repository: "",
  },
  methods: {
    ping: {
      metadata: { label: "Ping", description: "Ping" },
      parameters: { type: "object", properties: {} },
      responseSchema: { type: "object", properties: {} },
    },
  },
};

describe("readPluginManifestPreview", () => {
  it("reads and validates manifest metadata without executing plugin code", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-preview-"));
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
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-preview-"));
    fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({ metadata: { id: "Bad ID" } }));

    const preview = readPluginManifestPreview(path.join(dir, "manifest.json"));

    assert.equal(preview.valid, false);
    assert.equal(preview.manifest, null);
    assert.match(preview.errors.join("\n"), /metadata.id must match pattern/);
    assert.match(preview.errors.join("\n"), /root must have required property 'methods'/);
  });

  it("returns structured preview metadata, methods, triggers and missing-auth warning", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-preview-"));
    const manifest = {
      ...validManifest,
      triggers: {
        onMessage: {
          metadata: { label: "On Message", description: "Message received" },
          delivery: { mode: "webhook", requiresPublicUrl: true },
          parameters: { type: "object", properties: {} },
          payloadSchema: {
            type: "object",
            properties: {
              text: { type: "string" },
            },
          },
        },
      },
    };
    fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest));

    const preview = readPluginManifestPreview(path.join(dir, "manifest.json"));

    assert.equal(preview.valid, true);
    assert.equal(preview.metadata?.id, "preview-plugin");
    assert.deepEqual(preview.methods, [
      {
        name: "ping",
        label: "Ping",
        description: "Ping",
      },
    ]);
    assert.deepEqual(preview.triggers, [
      {
        name: "onMessage",
        label: "On Message",
        description: "Message received",
      },
    ]);
    assert.equal(preview.authType, null);
    assert.deepEqual(preview.warnings, [
      "Manifest preview does not declare auth type; runtime plugin auth will be checked on load.",
    ]);
  });

  it("accepts plugin triggers that declare delivery and payload schema", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-preview-"));
    const manifest = {
      ...validManifest,
      triggers: {
        onMessage: {
          metadata: { label: "On Message", description: "Message received" },
          delivery: { mode: "webhook", requiresPublicUrl: true },
          parameters: { type: "object", properties: {} },
          payloadSchema: {
            type: "object",
            properties: {
              eventId: { type: "string" },
              text: { type: "string" },
            },
            required: ["eventId"],
          },
        },
      },
    };
    fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest));

    const preview = readPluginManifestPreview(path.join(dir, "manifest.json"));

    assert.equal(preview.valid, true);
    assert.deepEqual(preview.triggerNames, ["onMessage"]);
  });

  it("rejects plugin triggers that omit delivery or payload schema", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-preview-"));
    const manifest = {
      ...validManifest,
      triggers: {
        onMessage: {
          metadata: { label: "On Message", description: "Message received" },
          parameters: { type: "object", properties: {} },
        },
      },
    };
    fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest));

    const preview = readPluginManifestPreview(path.join(dir, "manifest.json"));

    assert.equal(preview.valid, false);
    assert.match(preview.errors.join("\n"), /triggers\.onMessage must have required property 'delivery'/);
    assert.match(preview.errors.join("\n"), /triggers\.onMessage must have required property 'payloadSchema'/);
  });

  it("rejects plugin triggers with invalid delivery modes", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-preview-"));
    const manifest = {
      ...validManifest,
      triggers: {
        onMessage: {
          metadata: { label: "On Message", description: "Message received" },
          delivery: { mode: "socket" },
          payloadSchema: { type: "object", properties: {} },
        },
      },
    };
    fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest));

    const preview = readPluginManifestPreview(path.join(dir, "manifest.json"));

    assert.equal(preview.valid, false);
    assert.match(preview.errors.join("\n"), /triggers\.onMessage\.delivery\.mode must be one of/);
  });
});
