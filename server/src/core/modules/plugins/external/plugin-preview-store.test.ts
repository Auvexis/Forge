import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { PluginPreviewStore } from "./plugin-preview-store.ts";

describe("PluginPreviewStore", () => {
  it("stores previews, expires old entries and cleans cached folders", () => {
    const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "nd8-preview-store-"));
    const previewPath = path.join(cacheDir, "preview");
    fs.mkdirSync(previewPath);
    const store = new PluginPreviewStore({ ttlMs: 10, now: () => new Date("2026-05-15T10:00:00Z") });

    const preview = store.create({
      localPath: previewPath,
      preview: {
        valid: true,
        manifest: null as any,
        metadata: null,
        methodNames: [],
        methods: [],
        triggerNames: [],
        triggers: [],
        authType: null,
        warnings: [],
        errors: [],
      },
      release: null,
      source: { type: "extracted_folder", originalValue: "folder", cachedAt: "2026-05-15T10:00:00Z" },
    });

    assert.equal(store.get(preview.previewId)?.status, "ready");

    store.expireOld(new Date("2026-05-15T10:00:01Z"));

    assert.equal(store.get(preview.previewId), null);
    assert.equal(fs.existsSync(previewPath), false);
  });

  it("removes a cancelled preview without installing anything", () => {
    const previewPath = fs.mkdtempSync(path.join(os.tmpdir(), "nd8-preview-store-"));
    const store = new PluginPreviewStore();
    const preview = store.create({
      localPath: previewPath,
      preview: {
        valid: false,
        manifest: null,
        metadata: null,
        methodNames: [],
        methods: [],
        triggerNames: [],
        triggers: [],
        authType: null,
        warnings: [],
        errors: ["bad"],
      },
      release: null,
      source: { type: "extracted_folder", originalValue: "folder", cachedAt: "2026-05-15T10:00:00Z" },
    });

    assert.equal(store.remove(preview.previewId), true);
    assert.equal(store.get(preview.previewId), null);
    assert.equal(fs.existsSync(previewPath), false);
  });
});
