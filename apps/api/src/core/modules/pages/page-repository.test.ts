import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import Database from "better-sqlite3";

import { PageRepository } from "./page-repository.ts";
import type { PublishedPage, FabricPage } from "./page-types.ts";

function createPage(overrides: Partial<FabricPage> = {}): FabricPage {
  return {
    id: "page_contact",
    profileId: "profile_a",
    siteId: "site_default_profile_a",
    title: "Contact",
    slug: "contact",
    blocks: [],
    createdAt: "2026-05-23T00:00:00.000Z",
    updatedAt: "2026-05-23T00:00:00.000Z",
    ...overrides,
  };
}

function createPublishedPage(overrides: Partial<PublishedPage> = {}): PublishedPage {
  return {
    id: "published_contact",
    pageId: "page_contact",
    profileId: "profile_a",
    siteId: "site_default_profile_a",
    title: "Contact",
    slug: "contact",
    blocks: [],
    publishedAt: "2026-05-23T01:00:00.000Z",
    ...overrides,
  };
}

describe("PageRepository", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    PageRepository.setDatabaseProvider(() => db);
    PageRepository.ensureSchema();
  });

  it("creates a page with timestamps", () => {
    const page = createPage();

    PageRepository.savePage(page);

    assert.deepEqual(PageRepository.getPage("profile_a", "page_contact"), page);
  });

  it("lists pages sorted by updatedAt desc within a profile", () => {
    PageRepository.savePage(createPage({ id: "old", slug: "old", updatedAt: "2026-05-23T00:00:00.000Z" }));
    PageRepository.savePage(createPage({ id: "new", slug: "new", updatedAt: "2026-05-23T02:00:00.000Z" }));
    PageRepository.savePage(createPage({ id: "other", profileId: "profile_b", slug: "other" }));

    assert.deepEqual(
      PageRepository.listPages("profile_a").map((page) => page.id),
      ["new", "old"],
    );
  });

  it("updates a page without changing id or createdAt", () => {
    PageRepository.savePage(createPage());

    const updated = PageRepository.savePage(
      createPage({
        title: "Contact Updated",
        updatedAt: "2026-05-23T02:00:00.000Z",
      }),
    );

    assert.equal(updated.id, "page_contact");
    assert.equal(updated.createdAt, "2026-05-23T00:00:00.000Z");
    assert.equal(updated.title, "Contact Updated");
  });

  it("deletes page", () => {
    PageRepository.savePage(createPage());

    assert.equal(PageRepository.deletePage("profile_a", "page_contact"), true);
    assert.equal(PageRepository.getPage("profile_a", "page_contact"), null);
  });

  it("rejects duplicate slug in the same profile", () => {
    PageRepository.savePage(createPage({ id: "page_one" }));

    assert.throws(
      () => PageRepository.savePage(createPage({ id: "page_two" })),
      /slug already exists/i,
    );

    assert.doesNotThrow(() =>
      PageRepository.savePage(createPage({ id: "page_two", profileId: "profile_b" })),
    );
  });

  it("stores published snapshot separately from draft", () => {
    PageRepository.savePage(createPage());
    PageRepository.savePublishedPage(createPublishedPage());
    PageRepository.savePage(createPage({ title: "Draft changed" }));

    assert.equal(PageRepository.getPage("profile_a", "page_contact")?.title, "Draft changed");
    assert.equal(PageRepository.getPublishedPageBySlug("profile_a", "contact")?.title, "Contact");
  });

  it("deletes published snapshot by page id", () => {
    PageRepository.savePage(createPage());
    PageRepository.savePublishedPage(createPublishedPage());

    assert.equal(PageRepository.deletePublishedPageByPageId("profile_a", "page_contact"), true);
    assert.equal(PageRepository.getPublishedPageBySlug("profile_a", "contact"), null);
    assert.equal(PageRepository.getPublishedPageByPageId("profile_a", "page_contact"), null);
  });
});
