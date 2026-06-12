import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import Database from "better-sqlite3";

import { PageRepository } from "./page-repository.ts";
import { SiteRepository } from "./site-repository.ts";
import { SiteService } from "./site-service.ts";

describe("SiteService", () => {
  let db: Database.Database;
  let service: SiteService;

  beforeEach(() => {
    db = new Database(":memory:");
    SiteRepository.setDatabaseProvider(() => db);
    PageRepository.setDatabaseProvider(() => db);
    PageRepository.ensureSchema();
    service = new SiteService({ profileId: "profile_a" });
  });

  it("creates a site with default project folders", () => {
    const site = service.createSite({ name: "Marketing Site" });

    assert.equal(site.name, "Marketing Site");
    assert.equal(site.slug, "marketing-site");
    assert.deepEqual(site.files.map((file) => file.path), ["pages", "assets", "js", "css"]);
  });

  it("lists and updates sites inside the active profile", () => {
    const site = service.createSite({ name: "Docs" });
    SiteRepository.saveSite({ ...site, id: "other", profileId: "profile_b", slug: "docs-b" });

    const updated = service.updateSite(site.id, {
      name: "Docs Site",
      slug: "docs-site",
      files: [...site.files, { path: "css/site.css", kind: "file", content: "", updatedAt: "2026-05-24T00:00:00.000Z" }],
    });

    assert.equal(updated.slug, "docs-site");
    assert.equal(updated.files.some((file) => file.path === "css/site.css"), true);
    assert.deepEqual(service.listSites().map((item) => item.id), [site.id]);
  });

  it("creates pages inside a specific site", () => {
    const marketing = service.createSite({ name: "Marketing" });
    const docs = service.createSite({ name: "Docs" });

    const marketingPage = service.createPage(marketing.id, { title: "Home" });
    const docsPage = service.createPage(docs.id, { title: "Home" });

    assert.equal(marketingPage.siteId, marketing.id);
    assert.equal(docsPage.siteId, docs.id);
    assert.equal(service.listPages(marketing.id).length, 1);
    assert.equal(service.listPages(docs.id).length, 1);
  });

  it("deletes a site and its pages", () => {
    const site = service.createSite({ name: "Delete Me" });
    service.createPage(site.id, { title: "Home" });

    assert.equal(service.deleteSite(site.id), true);
    assert.equal(service.getSite(site.id), null);
    assert.equal(service.listPages(site.id).length, 0);
  });
});
