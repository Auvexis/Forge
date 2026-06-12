import { DatabaseManager } from "../../database/index.ts";
import type Database from "better-sqlite3";
import type { PublishedPage, SailorPage } from "./page-types.ts";
import { SiteRepository } from "./site-repository.ts";

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
    SiteRepository.ensureSchema();
    db.prepare(`
      CREATE TABLE IF NOT EXISTS pages (
        id TEXT NOT NULL,
        profile_id TEXT NOT NULL,
        site_id TEXT NOT NULL,
        slug TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        definition TEXT NOT NULL,
        PRIMARY KEY (profile_id, id),
        UNIQUE (profile_id, site_id, slug)
      )
    `).run();
    ensureColumn(db, "pages", "site_id", "TEXT");

    db.prepare(`
      CREATE TABLE IF NOT EXISTS published_pages (
        id TEXT NOT NULL,
        page_id TEXT NOT NULL,
        profile_id TEXT NOT NULL,
        site_id TEXT NOT NULL,
        slug TEXT NOT NULL,
        title TEXT NOT NULL,
        published_at TEXT NOT NULL,
        snapshot TEXT NOT NULL,
        PRIMARY KEY (profile_id, id),
        UNIQUE (profile_id, site_id, slug)
      )
    `).run();
    ensureColumn(db, "published_pages", "site_id", "TEXT");
    backfillSiteIds(db);
  },

  listPages(profileId: string, siteId?: string): SailorPage[] {
    const resolvedSiteId = siteId ?? SiteRepository.ensureDefaultSite(profileId).id;
    const rows = getPageDatabase()
      .prepare(
        `SELECT definition, site_id FROM pages WHERE profile_id = ? AND site_id = ? ORDER BY updated_at DESC`,
      )
      .all(profileId, resolvedSiteId) as Array<{ definition: string; site_id: string }>;

    return rows.map((row) => withSiteId(JSON.parse(row.definition) as Partial<SailorPage>, row.site_id));
  },

  getPage(profileId: string, id: string): SailorPage | null {
    const row = getPageDatabase()
      .prepare(`SELECT definition, site_id FROM pages WHERE profile_id = ? AND id = ?`)
      .get(profileId, id) as { definition: string; site_id: string } | undefined;

    return row ? withSiteId(JSON.parse(row.definition) as Partial<SailorPage>, row.site_id) : null;
  },

  getPageBySlug(profileId: string, slug: string, siteId?: string): SailorPage | null {
    const resolvedSiteId = siteId ?? SiteRepository.ensureDefaultSite(profileId).id;
    const row = getPageDatabase()
      .prepare(`SELECT definition, site_id FROM pages WHERE profile_id = ? AND site_id = ? AND slug = ?`)
      .get(profileId, resolvedSiteId, slug) as { definition: string; site_id: string } | undefined;

    return row ? withSiteId(JSON.parse(row.definition) as Partial<SailorPage>, row.site_id) : null;
  },

  savePage(page: SailorPage): SailorPage {
    const siteId = page.siteId ?? SiteRepository.ensureDefaultSite(page.profileId).id;
    const existingBySlug = this.getPageBySlug(page.profileId, page.slug, siteId);
    if (existingBySlug && existingBySlug.id !== page.id) {
      throw new Error(`Page slug already exists: ${page.slug}`);
    }

    const existing = this.getPage(page.profileId, page.id);
    const pageToSave: SailorPage = {
      ...page,
      siteId,
      createdAt: existing?.createdAt ?? page.createdAt,
    };

    getPageDatabase()
      .prepare(
        `INSERT INTO pages (id, profile_id, site_id, slug, title, created_at, updated_at, definition)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(profile_id, id) DO UPDATE SET
           site_id = excluded.site_id,
           slug = excluded.slug,
           title = excluded.title,
           updated_at = excluded.updated_at,
           definition = excluded.definition`,
      )
      .run(
        pageToSave.id,
        pageToSave.profileId,
        pageToSave.siteId,
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

  deletePagesBySite(profileId: string, siteId: string): number {
    const result = getPageDatabase()
      .prepare(`DELETE FROM pages WHERE profile_id = ? AND site_id = ?`)
      .run(profileId, siteId);
    return result.changes;
  },

  savePublishedPage(page: PublishedPage): PublishedPage {
    const siteId = page.siteId ?? SiteRepository.ensureDefaultSite(page.profileId).id;
    const pageToSave: PublishedPage = { ...page, siteId };
    getPageDatabase()
      .prepare(
        `INSERT INTO published_pages (id, page_id, profile_id, site_id, slug, title, published_at, snapshot)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(profile_id, site_id, slug) DO UPDATE SET
           id = excluded.id,
           page_id = excluded.page_id,
           title = excluded.title,
           published_at = excluded.published_at,
           snapshot = excluded.snapshot`,
      )
      .run(
        pageToSave.id,
        pageToSave.pageId,
        pageToSave.profileId,
        pageToSave.siteId,
        pageToSave.slug,
        pageToSave.title,
        pageToSave.publishedAt,
        JSON.stringify(pageToSave),
      );

    return pageToSave;
  },

  getPublishedPageBySlug(profileId: string, slug: string, siteId?: string): PublishedPage | null {
    const resolvedSiteId = siteId ?? SiteRepository.ensureDefaultSite(profileId).id;
    const row = getPageDatabase()
      .prepare(`SELECT snapshot, site_id FROM published_pages WHERE profile_id = ? AND site_id = ? AND slug = ?`)
      .get(profileId, resolvedSiteId, slug) as { snapshot: string; site_id: string } | undefined;

    return row ? withPublishedSiteId(JSON.parse(row.snapshot) as Partial<PublishedPage>, row.site_id) : null;
  },

  getPublishedPageByPageId(profileId: string, pageId: string): PublishedPage | null {
    const row = getPageDatabase()
      .prepare(`SELECT snapshot, site_id FROM published_pages WHERE profile_id = ? AND page_id = ? ORDER BY published_at DESC LIMIT 1`)
      .get(profileId, pageId) as { snapshot: string; site_id: string } | undefined;

    return row ? withPublishedSiteId(JSON.parse(row.snapshot) as Partial<PublishedPage>, row.site_id) : null;
  },

  deletePublishedPageByPageId(profileId: string, pageId: string): boolean {
    const result = getPageDatabase()
      .prepare(`DELETE FROM published_pages WHERE profile_id = ? AND page_id = ?`)
      .run(profileId, pageId);
    return result.changes > 0;
  },
};

function ensureColumn(db: Database.Database, table: string, column: string, definition: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (columns.some((item) => item.name === column)) return;
  db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
}

function backfillSiteIds(db: Database.Database): void {
  const rows = db.prepare(`SELECT DISTINCT profile_id FROM pages WHERE site_id IS NULL OR site_id = ''`).all() as Array<{ profile_id: string }>;
  for (const row of rows) {
    const site = SiteRepository.ensureDefaultSite(row.profile_id);
    db.prepare(`UPDATE pages SET site_id = ? WHERE profile_id = ? AND (site_id IS NULL OR site_id = '')`).run(site.id, row.profile_id);
    const pages = db.prepare(`SELECT id, definition FROM pages WHERE profile_id = ? AND site_id = ?`).all(row.profile_id, site.id) as Array<{ id: string; definition: string }>;
    for (const pageRow of pages) {
      const page = withSiteId(JSON.parse(pageRow.definition) as Partial<SailorPage>, site.id);
      db.prepare(`UPDATE pages SET definition = ? WHERE profile_id = ? AND id = ?`).run(JSON.stringify(page), row.profile_id, pageRow.id);
    }
  }

  const publishedRows = db.prepare(`SELECT DISTINCT profile_id FROM published_pages WHERE site_id IS NULL OR site_id = ''`).all() as Array<{ profile_id: string }>;
  for (const row of publishedRows) {
    const site = SiteRepository.ensureDefaultSite(row.profile_id);
    db.prepare(`UPDATE published_pages SET site_id = ? WHERE profile_id = ? AND (site_id IS NULL OR site_id = '')`).run(site.id, row.profile_id);
  }
}

function withSiteId(page: Partial<SailorPage>, fallbackSiteId: string): SailorPage {
  return { ...page, siteId: page.siteId ?? fallbackSiteId } as SailorPage;
}

function withPublishedSiteId(page: Partial<PublishedPage>, fallbackSiteId: string): PublishedPage {
  return { ...page, siteId: page.siteId ?? fallbackSiteId } as PublishedPage;
}
