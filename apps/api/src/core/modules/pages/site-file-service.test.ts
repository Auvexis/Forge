import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createSiteFile,
  deleteSiteFile,
  updateSiteFile,
  validateSiteProjectPath,
} from "./site-file-service.ts";
import type { FabricSite } from "./site-types.ts";

function site(): FabricSite {
  return {
    id: "site_1",
    publicId: "public_1",
    profileId: "profile_a",
    name: "Site",
    slug: "site",
    homePageId: null,
    files: [
      { path: "pages", kind: "folder", updatedAt: "2026-05-24T00:00:00.000Z" },
      { path: "assets", kind: "folder", updatedAt: "2026-05-24T00:00:00.000Z" },
      { path: "js", kind: "folder", updatedAt: "2026-05-24T00:00:00.000Z" },
      { path: "css", kind: "folder", updatedAt: "2026-05-24T00:00:00.000Z" },
    ],
    createdAt: "2026-05-24T00:00:00.000Z",
    updatedAt: "2026-05-24T00:00:00.000Z",
  };
}

describe("site file service", () => {
  it("validates project paths inside allowed root folders", () => {
    assert.equal(validateSiteProjectPath("css/site.css"), "css/site.css");
    assert.equal(validateSiteProjectPath("assets/brand/logo.png"), "assets/brand/logo.png");

    assert.throws(() => validateSiteProjectPath("../x.css"), /Invalid site file path/);
    assert.throws(() => validateSiteProjectPath("C:\\temp\\x.css"), /Invalid site file path/);
    assert.throws(() => validateSiteProjectPath("/tmp/x.css"), /Invalid site file path/);
    assert.throws(() => validateSiteProjectPath("server.ts"), /Invalid site file root/);
    assert.throws(() => validateSiteProjectPath("js/run.exe"), /Invalid site file extension/);
  });

  it("creates folders and files without duplicates", () => {
    const createdFolder = createSiteFile(site(), { path: "assets/brand", kind: "folder" });
    const createdFile = createSiteFile(createdFolder, { path: "css/site.css", kind: "file", content: "body{}" });

    assert.equal(createdFile.files.some((file) => file.path === "assets/brand"), true);
    assert.equal(createdFile.files.find((file) => file.path === "css/site.css")?.content, "body{}");
    assert.throws(() => createSiteFile(createdFile, { path: "css/site.css", kind: "file" }), /already exists/);
  });

  it("updates and deletes files", () => {
    const withFile = createSiteFile(site(), { path: "js/site.js", kind: "file", content: "" });
    const updated = updateSiteFile(withFile, "js/site.js", "console.log('ok')");
    const deleted = deleteSiteFile(updated, "js/site.js");

    assert.equal(updated.files.find((file) => file.path === "js/site.js")?.content, "console.log('ok')");
    assert.equal(deleted.files.some((file) => file.path === "js/site.js"), false);
  });
});
