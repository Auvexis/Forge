import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { saveSiteAsset } from "./site-asset-service.ts";

describe("site asset service", () => {
  it("stores uploaded images under the site assets folder and returns metadata", () => {
    const storageRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-site-assets-"));

    const asset = saveSiteAsset({
      storageRoot,
      profileId: "profile_a",
      siteId: "site_1",
      filename: "logo.png",
      buffer: Buffer.from("png"),
      mimeType: "image/png",
    });

    assert.equal(asset.path, "assets/logo.png");
    assert.equal(asset.kind, "asset");
    assert.equal(asset.url, "/sites/site_1/assets/logo.png");
    assert.equal(fs.readFileSync(path.join(storageRoot, "profile_a", "site_1", "assets", "logo.png"), "utf8"), "png");
  });

  it("rejects unsafe asset filenames and unsupported extensions", () => {
    const storageRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-site-assets-"));
    const base = {
      storageRoot,
      profileId: "profile_a",
      siteId: "site_1",
      buffer: Buffer.from("x"),
      mimeType: "image/png",
    };

    assert.throws(() => saveSiteAsset({ ...base, filename: "../logo.png" }), /Invalid site asset filename/);
    assert.throws(() => saveSiteAsset({ ...base, filename: "logo.exe" }), /Invalid site asset extension/);
  });
});
