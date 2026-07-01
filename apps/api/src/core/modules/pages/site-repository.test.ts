import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import Database from "better-sqlite3";

import { PageRepository } from "./page-repository.ts";
import { SiteRepository } from "./site-repository.ts";
import type { SailorPage } from "./page-types.ts";
import type { SailorSite } from "./site-types.ts";

function createSite(overrides: Partial<SailorSite> = {}): SailorSite {
  return {
    id: "site_main",
    publicId: "public_main",
    profileId: "profile_a",
    name: "Main Site",
    slug: "main-site",
    homePageId: null,
    files: [],
    createdAt: "2026-05-24T00:00:00.000Z",
    updatedAt: "2026-05-24T00:00:00.000Z",
    ...overrides,
  };
}

function createPage(overrides: Partial<SailorPage> = {}): SailorPage {
  return {
    id: "page_home",
    profileId: "profile_a",
    siteId: "site_main",
    title: "Home",
    slug: "home",
    blocks: [],
    createdAt: "2026-05-24T00:00:00.000Z",
    updatedAt: "2026-05-24T00:00:00.000Z",
    ...overrides,
  };
}

describe("SiteRepository", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    SiteRepository.setDatabaseProvider(() => db);
    PageRepository.setDatabaseProvider(() => db);
    PageRepository.ensureSchema();
  });

  it("saves and lists sites within a profile", () => {
    SiteRepository.saveSite(createSite());
    SiteRepository.saveSite(createSite({ id: "site_other", profileId: "profile_b", slug: "other" }));

    assert.deepEqual(
      SiteRepository.listSites("profile_a").map((site) => site.id),
      ["site_main"],
    );
    assert.equal(SiteRepository.getSite("profile_a", "site_main")?.name, "Main Site");
  });

  it("creates one default site per profile when requested", () => {
    const first = SiteRepository.ensureDefaultSite("profile_a");
    const second = SiteRepository.ensureDefaultSite("profile_a");

    assert.equal(first.id, second.id);
    assert.equal(first.name, "Default Site");
    assert.equal(SiteRepository.listSites("profile_a").length, 1);
  });

  it("allows the same page slug in different sites", () => {
    SiteRepository.saveSite(createSite());
    SiteRepository.saveSite(createSite({ id: "site_docs", slug: "docs" }));

    PageRepository.savePage(createPage({ id: "page_home_main", siteId: "site_main", slug: "home" }));
    PageRepository.savePage(createPage({ id: "page_home_docs", siteId: "site_docs", slug: "home" }));

    assert.equal(PageRepository.getPageBySlug("profile_a", "home", "site_main")?.id, "page_home_main");
    assert.equal(PageRepository.getPageBySlug("profile_a", "home", "site_docs")?.id, "page_home_docs");
  });

  it("backfills legacy pages into the profile default site", () => {
    db.prepare(`DROP TABLE pages`).run();
    db.prepare(`
      CREATE TABLE pages (
        id TEXT NOT NULL,
        profile_id TEXT NOT NULL,
        slug TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        definition TEXT NOT NULL,
        PRIMARY KEY (profile_id, id)
      )
    `).run();
    db.prepare(`
      INSERT INTO pages (id, profile_id, slug, title, created_at, updated_at, definition)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      "legacy_page",
      "profile_legacy",
      "legacy",
      "Legacy",
      "2026-05-24T00:00:00.000Z",
      "2026-05-24T00:00:00.000Z",
      JSON.stringify({
        id: "legacy_page",
        profileId: "profile_legacy",
        title: "Legacy",
        slug: "legacy",
        blocks: [],
        createdAt: "2026-05-24T00:00:00.000Z",
        updatedAt: "2026-05-24T00:00:00.000Z",
      }),
    );

    PageRepository.ensureSchema();

    const site = SiteRepository.ensureDefaultSite("profile_legacy");
    const page = PageRepository.getPage("profile_legacy", "legacy_page");
    assert.equal(page?.siteId, site.id);
    assert.equal(PageRepository.listPages("profile_legacy", site.id).length, 1);
  });
});
