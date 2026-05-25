import fs from "node:fs";
import path from "node:path";

import { PageRepository } from "./page-repository.ts";
import { validateSiteProjectPath } from "./site-file-service.ts";
import { SiteRepository } from "./site-repository.ts";
import type { PageBlockStyles, SailorPage } from "./page-types.ts";
import type { SailorSite, SiteFile } from "./site-types.ts";

export interface SiteProjectArchive {
  manifest: {
    schemaVersion: 1;
    site: {
      name: string;
      slug: string;
      homePageId: string | null;
    };
  };
  pages: Array<{
    id: string;
    title: string;
    slug: string;
    bodyStyles?: PageBlockStyles;
    blocks: SailorPage["blocks"];
  }>;
  files: SiteFile[];
  assets: Array<{
    path: string;
    mimeType?: string;
    base64: string;
  }>;
}

export class SiteProjectArchiveService {
  private readonly assetStorageRoot: string;

  constructor(options: { assetStorageRoot: string }) {
    this.assetStorageRoot = options.assetStorageRoot;
  }

  exportSite(profileId: string, siteId: string): SiteProjectArchive {
    const site = SiteRepository.getSite(profileId, siteId);
    if (!site) throw new Error("Site not found.");
    const pages = PageRepository.listPages(profileId, siteId);

    return {
      manifest: {
        schemaVersion: 1,
        site: {
          name: site.name,
          slug: site.slug,
          homePageId: site.homePageId,
        },
      },
      pages: pages.map((page) => ({
        id: page.id,
        title: page.title,
        slug: page.slug,
        bodyStyles: page.bodyStyles,
        blocks: page.blocks,
      })),
      files: site.files.map((file) => ({ ...file })),
      assets: site.files
        .filter((file) => file.kind === "asset")
        .map((file) => ({
          path: file.path,
          mimeType: file.mimeType,
          base64: this.readAssetBase64(profileId, siteId, file.path),
        })),
    };
  }

  importSite(profileId: string, archive: SiteProjectArchive): SailorSite {
    this.validateArchive(archive);
    const now = new Date().toISOString();
    const siteId = createSiteId();
    const site: SailorSite = {
      id: siteId,
      profileId,
      name: archive.manifest.site.name,
      slug: this.uniqueSiteSlug(profileId, archive.manifest.site.slug),
      homePageId: null,
      files: archive.files.map((file) => ({ ...file, updatedAt: file.updatedAt ?? now })),
      createdAt: now,
      updatedAt: now,
    };

    const savedSite = SiteRepository.saveSite(site);
    const pageIdMap = new Map<string, string>();
    for (const page of archive.pages) {
      const nextId = createPageId();
      pageIdMap.set(page.id, nextId);
      PageRepository.savePage({
        id: nextId,
        profileId,
        siteId,
        title: page.title,
        slug: this.uniquePageSlug(profileId, siteId, page.slug),
        bodyStyles: page.bodyStyles,
        blocks: page.blocks,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const asset of archive.assets) {
      this.writeAsset(profileId, siteId, asset.path, Buffer.from(asset.base64, "base64"));
    }

    const mappedHomePageId = archive.manifest.site.homePageId ? pageIdMap.get(archive.manifest.site.homePageId) ?? null : null;
    return SiteRepository.saveSite({ ...savedSite, homePageId: mappedHomePageId, updatedAt: now });
  }

  private validateArchive(archive: SiteProjectArchive): void {
    if (archive.manifest?.schemaVersion !== 1) throw new Error("Invalid site archive schema.");
    if (!archive.manifest.site.name.trim()) throw new Error("Site archive name is required.");
    for (const file of archive.files) validateSiteProjectPath(file.path);
    for (const asset of archive.assets) validateSiteProjectPath(asset.path);
  }

  private readAssetBase64(profileId: string, siteId: string, filePath: string): string {
    const targetPath = this.assetPath(profileId, siteId, filePath);
    if (!fs.existsSync(targetPath)) return "";
    return fs.readFileSync(targetPath).toString("base64");
  }

  private writeAsset(profileId: string, siteId: string, filePath: string, buffer: Buffer): void {
    const targetPath = this.assetPath(profileId, siteId, filePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, buffer);
  }

  private assetPath(profileId: string, siteId: string, filePath: string): string {
    const normalized = validateSiteProjectPath(filePath);
    return path.join(this.assetStorageRoot, profileId, siteId, normalized);
  }

  private uniqueSiteSlug(profileId: string, slug: string): string {
    const baseSlug = slug || "site";
    let candidate = baseSlug;
    let suffix = 2;
    while (SiteRepository.getSiteBySlug(profileId, candidate)) {
      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  private uniquePageSlug(profileId: string, siteId: string, slug: string): string {
    const baseSlug = slug || "page";
    let candidate = baseSlug;
    let suffix = 2;
    while (PageRepository.getPageBySlug(profileId, candidate, siteId)) {
      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }
}

function createSiteId(): string {
  return `site_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createPageId(): string {
  return `page_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
