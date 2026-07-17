import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, it } from "node:test";
import Database from "better-sqlite3";

import { PageRepository } from "./page-repository.ts";
import { saveSiteAsset } from "./site-asset-service.ts";
import { SiteProjectArchiveService } from "./site-project-archive-service.ts";
import { SiteRepository } from "./site-repository.ts";
import { SiteService } from "./site-service.ts";

describe("SiteProjectArchiveService", () => {
  let db: Database.Database;
  let assetStorageRoot: string;

  beforeEach(() => {
    db = new Database(":memory:");
    assetStorageRoot = fs.mkdtempSync(path.join(os.tmpdir(), "fabric-site-archive-"));
    SiteRepository.setDatabaseProvider(() => db);
    PageRepository.setDatabaseProvider(() => db);
    PageRepository.ensureSchema();
  });

  it("exports manifest, pages, files and asset bytes", () => {
    const sites = new SiteService({ profileId: "profile_a" });
    const site = sites.createSite({ name: "Marketing" });
    sites.createPage(site.id, { title: "Home" });
    const asset = saveSiteAsset({
      storageRoot: assetStorageRoot,
      profileId: "profile_a",
      siteId: site.id,
      filename: "logo.png",
      buffer: Buffer.from("png"),
      mimeType: "image/png",
    });
    sites.createProjectFile(site.id, asset);

    const archive = new SiteProjectArchiveService({ assetStorageRoot }).exportSite("profile_a", site.id);

    assert.equal(archive.manifest.schemaVersion, 1);
    assert.equal(archive.manifest.site.name, "Marketing");
    assert.equal(archive.pages.length, 1);
    assert.equal(archive.assets[0]?.path, "assets/logo.png");
    assert.equal(archive.assets[0]?.base64, Buffer.from("png").toString("base64"));
  });

  it("exports project files as zip entries", () => {
    const sites = new SiteService({ profileId: "profile_a" });
    const site = sites.createSite({ name: "Marketing" });
    sites.createProjectFile(site.id, {
      path: "blueprints/project.blueprint.json",
      kind: "file",
      content: "{\"schemaVersion\":1}",
    });

    const zip = new SiteProjectArchiveService({ assetStorageRoot }).exportSiteZip("profile_a", site.id);

    assert.match(zip.toString("utf8"), /blueprints\/project\.blueprint\.json/);
    assert.match(zip.toString("utf8"), /\{"schemaVersion":1\}/);
  });

  it("imports into the active profile with a new id and resolved slug", () => {
    const sites = new SiteService({ profileId: "profile_a" });
    const site = sites.createSite({ name: "Marketing" });
    sites.createPage(site.id, { title: "Home" });
    const archive = new SiteProjectArchiveService({ assetStorageRoot }).exportSite("profile_a", site.id);

    const imported = new SiteProjectArchiveService({ assetStorageRoot }).importSite("profile_b", archive);

    assert.equal(imported.profileId, "profile_b");
    assert.notEqual(imported.id, site.id);
    assert.equal(SiteRepository.listSites("profile_b").length, 1);
    assert.equal(PageRepository.listPages("profile_b", imported.id).length, 1);
  });

  it("rejects unsafe paths during import", () => {
    const archive = {
      manifest: {
        schemaVersion: 1 as const,
        site: { name: "Unsafe", slug: "unsafe", homePageId: null },
      },
      pages: [],
      files: [{ path: "../bad.js", kind: "file" as const, content: "", updatedAt: "2026-05-24T00:00:00.000Z" }],
      assets: [],
    };

    assert.throws(
      () => new SiteProjectArchiveService({ assetStorageRoot }).importSite("profile_a", archive),
      /Invalid site file path/,
    );
  });
});
