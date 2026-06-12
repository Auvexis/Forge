import { DatabaseManager } from "../../database/index.ts";
import type Database from "better-sqlite3";
import type { SailorSite } from "./site-types.ts";

type SiteDatabaseProvider = () => Database.Database;

let siteDatabaseProvider: SiteDatabaseProvider = () => DatabaseManager.workflows;

function getSiteDatabase(): Database.Database {
  return siteDatabaseProvider();
}

export const SiteRepository = {
  setDatabaseProvider(provider: SiteDatabaseProvider): void {
    siteDatabaseProvider = provider;
  },

  resetDatabaseProvider(): void {
    siteDatabaseProvider = () => DatabaseManager.workflows;
  },

  ensureSchema(): void {
    getSiteDatabase()
      .prepare(`
        CREATE TABLE IF NOT EXISTS sites (
          id TEXT NOT NULL,
          profile_id TEXT NOT NULL,
          slug TEXT NOT NULL,
          name TEXT NOT NULL,
          home_page_id TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          definition TEXT NOT NULL,
          PRIMARY KEY (profile_id, id),
          UNIQUE (profile_id, slug)
        )
      `)
      .run();
  },

  listSites(profileId: string): SailorSite[] {
    const rows = getSiteDatabase()
      .prepare(`SELECT definition FROM sites WHERE profile_id = ? ORDER BY updated_at DESC`)
      .all(profileId) as Array<{ definition: string }>;

    return rows.map((row) => JSON.parse(row.definition) as SailorSite);
  },

  getSite(profileId: string, id: string): SailorSite | null {
    const row = getSiteDatabase()
      .prepare(`SELECT definition FROM sites WHERE profile_id = ? AND id = ?`)
      .get(profileId, id) as { definition: string } | undefined;

    return row ? (JSON.parse(row.definition) as SailorSite) : null;
  },

  getSiteBySlug(profileId: string, slug: string): SailorSite | null {
    const row = getSiteDatabase()
      .prepare(`SELECT definition FROM sites WHERE profile_id = ? AND slug = ?`)
      .get(profileId, slug) as { definition: string } | undefined;

    return row ? (JSON.parse(row.definition) as SailorSite) : null;
  },

  ensureDefaultSite(profileId: string): SailorSite {
    this.ensureSchema();
    const existing = this.getSite(profileId, defaultSiteId(profileId));
    if (existing) return existing;

    const now = new Date().toISOString();
    return this.saveSite({
      id: defaultSiteId(profileId),
      profileId,
      name: "Default Site",
      slug: "default-site",
      homePageId: null,
      files: defaultSiteFiles(now),
      createdAt: now,
      updatedAt: now,
    });
  },

  saveSite(site: SailorSite): SailorSite {
    this.ensureSchema();
    const existingBySlug = this.getSiteBySlug(site.profileId, site.slug);
    if (existingBySlug && existingBySlug.id !== site.id) {
      throw new Error(`Site slug already exists: ${site.slug}`);
    }

    const existing = this.getSite(site.profileId, site.id);
    const siteToSave: SailorSite = {
      ...site,
      createdAt: existing?.createdAt ?? site.createdAt,
    };

    getSiteDatabase()
      .prepare(
        `INSERT INTO sites (id, profile_id, slug, name, home_page_id, created_at, updated_at, definition)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(profile_id, id) DO UPDATE SET
           slug = excluded.slug,
           name = excluded.name,
           home_page_id = excluded.home_page_id,
           updated_at = excluded.updated_at,
           definition = excluded.definition`,
      )
      .run(
        siteToSave.id,
        siteToSave.profileId,
        siteToSave.slug,
        siteToSave.name,
        siteToSave.homePageId,
        siteToSave.createdAt,
        siteToSave.updatedAt,
        JSON.stringify(siteToSave),
      );

    return siteToSave;
  },

  deleteSite(profileId: string, id: string): boolean {
    const result = getSiteDatabase()
      .prepare(`DELETE FROM sites WHERE profile_id = ? AND id = ?`)
      .run(profileId, id);
    return result.changes > 0;
  },
};

export function defaultSiteId(profileId: string): string {
  return `site_default_${profileId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function defaultSiteFiles(now: string) {
  return ["pages", "assets", "js", "css"].map((path) => ({
    path,
    kind: "folder" as const,
    updatedAt: now,
  }));
}
