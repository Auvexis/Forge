import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import Database from "better-sqlite3";

import { PageRepository } from "./page-repository.ts";
import { PageService } from "./page-service.ts";

describe("PageService", () => {
  let db: Database.Database;
  let service: PageService;

  beforeEach(() => {
    db = new Database(":memory:");
    PageRepository.setDatabaseProvider(() => db);
    PageRepository.ensureSchema();
    service = new PageService({ profileId: "profile_a" });
  });

  it("creates page with an empty canvas", () => {
    const page = service.createPage({ profileId: "profile_a", title: "Landing Page" });

    assert.equal(page.title, "Landing Page");
    assert.equal(page.slug, "landing-page");
    assert.deepEqual(page.blocks, []);
  });

  it("updates page after validation", () => {
    const page = service.createPage({ profileId: "profile_a", title: "Landing Page" });
    const updated = service.updatePage(page.id, {
      title: "Home",
      slug: "home",
      blocks: [{ id: "text_1", tag: "text", props: { text: "Hello" }, children: [] }],
    });

    assert.equal(updated.title, "Home");
    assert.equal(updated.slug, "home");
    assert.equal(updated.blocks[0]?.tag, "text");
  });

  it("returns validation error for invalid block tree", () => {
    const page = service.createPage({ profileId: "profile_a", title: "Landing Page" });

    assert.throws(
      () => service.updatePage(page.id, { blocks: [{ id: "bad", tag: "script" as any, children: [] }] }),
      /unsupported tag/i,
    );
  });

  it("publishes sanitized snapshot", () => {
    const page = service.createPage({ profileId: "profile_a", title: "Landing Page" });
    service.updatePage(page.id, {
      blocks: [
        {
          id: "section_1",
          tag: "section",
          styles: { padding: "24px", position: "fixed" } as any,
          children: [],
        },
      ],
    });

    const published = service.publishPage(page.id);

    assert.equal(published.slug, "landing-page");
    assert.deepEqual(published.blocks[0]?.styles, { padding: "24px" });
  });

  it("lists pages with publication timestamp", () => {
    const page = service.createPage({ profileId: "profile_a", title: "Landing Page" });

    assert.equal(service.listPages()[0]?.publishedAt, null);

    const published = service.publishPage(page.id);
    const listed = service.listPages()[0];

    assert.equal(listed?.publishedAt, published.publishedAt);
  });

  it("preview renders draft", () => {
    const page = service.createPage({ profileId: "profile_a", title: "Landing Page" });
    service.updatePage(page.id, {
      blocks: [{ id: "text_1", tag: "text", props: { text: "Draft text" }, children: [] }],
    });

    assert.match(service.renderPreview(page.id) ?? "", /Draft text/);
  });

  it("published route renders snapshot even if draft changes later", () => {
    const page = service.createPage({ profileId: "profile_a", title: "Landing Page" });
    service.updatePage(page.id, {
      blocks: [{ id: "text_1", tag: "text", props: { text: "Published text" }, children: [] }],
    });
    service.publishPage(page.id);
    service.updatePage(page.id, {
      blocks: [{ id: "text_1", tag: "text", props: { text: "Draft changed" }, children: [] }],
    });

    const html = service.renderPublished("landing-page") ?? "";

    assert.match(html, /Published text/);
    assert.doesNotMatch(html, /Draft changed/);
  });
});
