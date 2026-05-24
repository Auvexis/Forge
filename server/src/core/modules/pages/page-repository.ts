import { DatabaseManager } from "../../database/index.ts";
import type Database from "better-sqlite3";
import type { PublishedPage, SailorPage } from "./page-types.ts";

type PageDatabaseProvider = () => Database.Database;

let pageDatabaseProvider: PageDatabaseProvider = () => DatabaseManager.workflows;

function getPageDatabase(): Database.Database {
  return pageDatabaseProvider();
}

export const PageRepository = {
  setDatabaseProvider(provider: PageDatabaseProvider): void {
    pageDatabaseProvider = provider;
  },

  resetDatabaseProvider(): void {
    pageDatabaseProvider = () => DatabaseManager.workflows;
  },

  ensureSchema(): void {
    const db = getPageDatabase();
    db.prepare(`
      CREATE TABLE IF NOT EXISTS pages (
        id TEXT NOT NULL,
        profile_id TEXT NOT NULL,
        slug TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        definition TEXT NOT NULL,
        PRIMARY KEY (profile_id, id),
        UNIQUE (profile_id, slug)
      )
    `).run();

    db.prepare(`
      CREATE TABLE IF NOT EXISTS published_pages (
        id TEXT NOT NULL,
        page_id TEXT NOT NULL,
        profile_id TEXT NOT NULL,
        slug TEXT NOT NULL,
        title TEXT NOT NULL,
        published_at TEXT NOT NULL,
        snapshot TEXT NOT NULL,
        PRIMARY KEY (profile_id, id),
        UNIQUE (profile_id, slug)
      )
    `).run();
  },

  listPages(profileId: string): SailorPage[] {
    const rows = getPageDatabase()
      .prepare(
        `SELECT definition FROM pages WHERE profile_id = ? ORDER BY updated_at DESC`,
      )
      .all(profileId) as Array<{ definition: string }>;

    return rows.map((row) => JSON.parse(row.definition) as SailorPage);
  },

  getPage(profileId: string, id: string): SailorPage | null {
    const row = getPageDatabase()
      .prepare(`SELECT definition FROM pages WHERE profile_id = ? AND id = ?`)
      .get(profileId, id) as { definition: string } | undefined;

    return row ? (JSON.parse(row.definition) as SailorPage) : null;
  },

  getPageBySlug(profileId: string, slug: string): SailorPage | null {
    const row = getPageDatabase()
      .prepare(`SELECT definition FROM pages WHERE profile_id = ? AND slug = ?`)
      .get(profileId, slug) as { definition: string } | undefined;

    return row ? (JSON.parse(row.definition) as SailorPage) : null;
  },

  savePage(page: SailorPage): SailorPage {
    const existingBySlug = this.getPageBySlug(page.profileId, page.slug);
    if (existingBySlug && existingBySlug.id !== page.id) {
      throw new Error(`Page slug already exists: ${page.slug}`);
    }

    const existing = this.getPage(page.profileId, page.id);
    const pageToSave: SailorPage = {
      ...page,
      createdAt: existing?.createdAt ?? page.createdAt,
    };

    getPageDatabase()
      .prepare(
        `INSERT INTO pages (id, profile_id, slug, title, created_at, updated_at, definition)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(profile_id, id) DO UPDATE SET
           slug = excluded.slug,
           title = excluded.title,
           updated_at = excluded.updated_at,
           definition = excluded.definition`,
      )
      .run(
        pageToSave.id,
        pageToSave.profileId,
        pageToSave.slug,
        pageToSave.title,
        pageToSave.createdAt,
        pageToSave.updatedAt,
        JSON.stringify(pageToSave),
      );

    return pageToSave;
  },

  deletePage(profileId: string, id: string): boolean {
    const result = getPageDatabase()
      .prepare(`DELETE FROM pages WHERE profile_id = ? AND id = ?`)
      .run(profileId, id);
    return result.changes > 0;
  },

  savePublishedPage(page: PublishedPage): PublishedPage {
    getPageDatabase()
      .prepare(
        `INSERT INTO published_pages (id, page_id, profile_id, slug, title, published_at, snapshot)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(profile_id, slug) DO UPDATE SET
           id = excluded.id,
           page_id = excluded.page_id,
           title = excluded.title,
           published_at = excluded.published_at,
           snapshot = excluded.snapshot`,
      )
      .run(
        page.id,
        page.pageId,
        page.profileId,
        page.slug,
        page.title,
        page.publishedAt,
        JSON.stringify(page),
      );

    return page;
  },

  getPublishedPageBySlug(profileId: string, slug: string): PublishedPage | null {
    const row = getPageDatabase()
      .prepare(`SELECT snapshot FROM published_pages WHERE profile_id = ? AND slug = ?`)
      .get(profileId, slug) as { snapshot: string } | undefined;

    return row ? (JSON.parse(row.snapshot) as PublishedPage) : null;
  },

  getPublishedPageByPageId(profileId: string, pageId: string): PublishedPage | null {
    const row = getPageDatabase()
      .prepare(`SELECT snapshot FROM published_pages WHERE profile_id = ? AND page_id = ? ORDER BY published_at DESC LIMIT 1`)
      .get(profileId, pageId) as { snapshot: string } | undefined;

    return row ? (JSON.parse(row.snapshot) as PublishedPage) : null;
  },

  deletePublishedPageByPageId(profileId: string, pageId: string): boolean {
    const result = getPageDatabase()
      .prepare(`DELETE FROM published_pages WHERE profile_id = ? AND page_id = ?`)
      .run(profileId, pageId);
    return result.changes > 0;
  },
};
