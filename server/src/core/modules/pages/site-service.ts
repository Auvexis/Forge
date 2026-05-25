import { PageRepository } from "./page-repository.ts";
import { PageService } from "./page-service.ts";
import { createSiteFile, deleteSiteFile, updateSiteFile } from "./site-file-service.ts";
import { SiteRepository } from "./site-repository.ts";
import type { CreatePageInput, SailorPage } from "./page-types.ts";
import type { SailorSite, SiteFile } from "./site-types.ts";

export interface CreateSiteInput {
  name: string;
  slug?: string;
}

export interface UpdateSiteInput {
  name?: string;
  slug?: string;
  homePageId?: string | null;
  files?: SiteFile[];
}

export class SiteService {
  private readonly profileId: string;

  constructor(options: { profileId: string }) {
    this.profileId = options.profileId;
    PageRepository.ensureSchema();
  }

  listSites(): SailorSite[] {
    return SiteRepository.listSites(this.profileId);
  }

  createSite(input: CreateSiteInput): SailorSite {
    const name = input.name.trim();
    if (!name) throw new Error("Site name is required.");

    const now = new Date().toISOString();
    return SiteRepository.saveSite({
      id: createSiteId(),
      profileId: this.profileId,
      name,
      slug: input.slug ?? this.createUniqueSlug(name),
      homePageId: null,
      files: defaultProjectFolders(now),
      createdAt: now,
      updatedAt: now,
    });
  }

  getSite(siteId: string): SailorSite | null {
    return SiteRepository.getSite(this.profileId, siteId);
  }

  updateSite(siteId: string, input: UpdateSiteInput): SailorSite {
    const existing = this.getSite(siteId);
    if (!existing) throw new Error("Site not found.");

    return SiteRepository.saveSite({
      ...existing,
      name: input.name?.trim() || existing.name,
      slug: input.slug ?? existing.slug,
      homePageId: input.homePageId === undefined ? existing.homePageId : input.homePageId,
      files: input.files ?? existing.files,
      updatedAt: new Date().toISOString(),
    });
  }

  deleteSite(siteId: string): boolean {
    PageRepository.deletePagesBySite(this.profileId, siteId);
    return SiteRepository.deleteSite(this.profileId, siteId);
  }

  listPages(siteId: string): SailorPage[] {
    return PageRepository.listPages(this.profileId, siteId);
  }

  createPage(siteId: string, input: Omit<CreatePageInput, "profileId" | "siteId">): SailorPage {
    const site = this.getSite(siteId);
    if (!site) throw new Error("Site not found.");

    const page = new PageService({ profileId: this.profileId }).createPage({
      profileId: this.profileId,
      siteId,
      title: input.title,
      slug: input.slug,
      blocks: input.blocks,
    });

    if (!site.homePageId) {
      SiteRepository.saveSite({ ...site, homePageId: page.id, updatedAt: new Date().toISOString() });
    }

    return page;
  }

  createProjectFile(siteId: string, input: { path: string; kind: SiteFile["kind"]; content?: string; mimeType?: string; size?: number; url?: string }): SailorSite {
    const site = this.requireSite(siteId);
    return SiteRepository.saveSite(createSiteFile(site, input));
  }

  updateProjectFile(siteId: string, filePath: string, content: string): SailorSite {
    const site = this.requireSite(siteId);
    return SiteRepository.saveSite(updateSiteFile(site, filePath, content));
  }

  deleteProjectFile(siteId: string, filePath: string): SailorSite {
    const site = this.requireSite(siteId);
    return SiteRepository.saveSite(deleteSiteFile(site, filePath));
  }

  private requireSite(siteId: string): SailorSite {
    const site = this.getSite(siteId);
    if (!site) throw new Error("Site not found.");
    return site;
  }

  private createUniqueSlug(name: string): string {
    const baseSlug = slugify(name);
    let slug = baseSlug;
    let suffix = 2;
    while (SiteRepository.getSiteBySlug(this.profileId, slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
    return slug;
  }
}

function createSiteId(): string {
  return `site_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function defaultProjectFolders(now: string) {
  return ["pages", "assets", "js", "css"].map((path) => ({
    path,
    kind: "folder" as const,
    updatedAt: now,
  }));
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug.length >= 3 ? slug.slice(0, 80).replace(/-+$/g, "") : "site";
}
