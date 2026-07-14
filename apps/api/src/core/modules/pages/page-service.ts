import { PageRepository } from "./page-repository.ts";
import { renderPublishedPage } from "./page-renderer.ts";
import { validatePageInput } from "./page-validation.ts";
import { SiteRepository } from "./site-repository.ts";
import type { CreatePageInput, PublishedPage, FabricPage, UpdatePageInput } from "./page-types.ts";

export interface FabricPageSummary {
  id: string;
  title: string;
  slug: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface PagePublicationStatus {
  pageId: string;
  publishedAt: string | null;
}

export class PageService {
  private readonly profileId: string;

  constructor(options: { profileId: string }) {
    this.profileId = options.profileId;
    PageRepository.ensureSchema();
  }

  listPages(): FabricPageSummary[] {
    return PageRepository.listPages(this.profileId).map((page) => ({
      id: page.id,
      title: page.title,
      slug: page.slug,
      updatedAt: page.updatedAt,
      publishedAt: PageRepository.getPublishedPageByPageId(this.profileId, page.id)?.publishedAt ?? null,
    }));
  }

  createPage(input: CreatePageInput): FabricPage {
    const now = new Date().toISOString();
    const siteId = input.siteId ?? SiteRepository.ensureDefaultSite(this.profileId).id;
    const page: FabricPage = {
      id: createPageId(),
      profileId: this.profileId,
      siteId,
      title: input.title,
      slug: input.slug ?? this.createUniqueSlug(input.title, siteId),
      publicPath: input.publicPath,
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
      faviconUrl: input.faviconUrl,
      bodyStyles: input.bodyStyles ?? defaultBodyStyles(),
      pageActions: input.pageActions,
      blocks: input.blocks ?? [],
      createdAt: now,
      updatedAt: now,
    };

    return this.validateAndSave(page);
  }

  getPage(id: string): FabricPage | null {
    return PageRepository.getPage(this.profileId, id);
  }

  updatePage(id: string, input: UpdatePageInput): FabricPage {
    const existing = this.getPage(id);
    if (!existing) {
      throw new Error("Page not found.");
    }

    const page: FabricPage = {
      ...existing,
      title: input.title ?? existing.title,
      slug: input.slug ?? existing.slug,
      publicPath: input.publicPath ?? existing.publicPath,
      metaTitle: input.metaTitle ?? existing.metaTitle,
      metaDescription: input.metaDescription ?? existing.metaDescription,
      faviconUrl: input.faviconUrl ?? existing.faviconUrl,
      bodyStyles: input.bodyStyles ?? existing.bodyStyles,
      pageActions: input.pageActions ?? existing.pageActions,
      blocks: input.blocks ?? existing.blocks,
      updatedAt: new Date().toISOString(),
    };

    return this.validateAndSave(page);
  }

  deletePage(id: string): boolean {
    return PageRepository.deletePage(this.profileId, id);
  }

  publishPage(id: string): PublishedPage {
    const page = this.getPage(id);
    if (!page) {
      throw new Error("Page not found.");
    }

    const validation = validatePageInput(page);
    if (!validation.success) {
      throw new Error(validation.error);
    }

    const published: PublishedPage = {
      id: `published_${page.id}`,
      pageId: page.id,
      profileId: this.profileId,
      siteId: page.siteId,
      title: validation.page.title,
      slug: validation.page.publicPath ?? validation.page.slug,
      fileSlug: validation.page.slug,
      publicPath: validation.page.publicPath,
      metaTitle: validation.page.metaTitle,
      metaDescription: validation.page.metaDescription,
      faviconUrl: validation.page.faviconUrl,
      bodyStyles: validation.page.bodyStyles,
      pageActions: validation.page.pageActions,
      blocks: validation.page.blocks,
      publishedAt: new Date().toISOString(),
    };

    return PageRepository.savePublishedPage(published);
  }

  unpublishPage(id: string): PagePublicationStatus {
    const page = this.getPage(id);
    if (!page) {
      throw new Error("Page not found.");
    }

    PageRepository.deletePublishedPageByPageId(this.profileId, id);
    return { pageId: id, publishedAt: null };
  }

  publicationStatus(id: string): { publishedAt: string | null } {
    return {
      publishedAt: PageRepository.getPublishedPageByPageId(this.profileId, id)?.publishedAt ?? null,
    };
  }

  renderPreview(id: string): string | null {
    const page = this.getPage(id);
    if (!page) return null;
    return renderPublishedPage({
      id: `preview_${page.id}`,
      pageId: page.id,
      profileId: this.profileId,
      siteId: page.siteId,
      title: page.title,
      slug: page.slug,
      fileSlug: page.slug,
      publicPath: page.publicPath,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      faviconUrl: page.faviconUrl,
      bodyStyles: page.bodyStyles,
      pageActions: page.pageActions,
      blocks: page.blocks,
      publishedAt: new Date().toISOString(),
    }, SiteRepository.getSite(this.profileId, page.siteId));
  }

  renderPublished(projectPublicId: string, path: string): string | null {
    const slugs = normalizePublishedPathCandidates(path);
    const site = SiteRepository.getSiteByPublicId(this.profileId, projectPublicId) ?? SiteRepository.getSite(this.profileId, projectPublicId);
    if (!site) return null;
    const page = slugs
      .map((slug) => PageRepository.getPublishedPageBySlug(this.profileId, slug, site.id))
      .find((publishedPage) => publishedPage !== null);
    return page ? renderPublishedPage(page, SiteRepository.getSite(this.profileId, page.siteId)) : null;
  }

  private validateAndSave(page: FabricPage): FabricPage {
    const validation = validatePageInput(page);
    if (!validation.success) {
      throw new Error(validation.error);
    }
    return PageRepository.savePage(validation.page);
  }

  private createUniqueSlug(title: string, siteId?: string): string {
    const baseSlug = slugify(title);
    let slug = baseSlug;
    let suffix = 2;
    while (PageRepository.getPageBySlug(this.profileId, slug, siteId)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
    return slug;
  }
}

function defaultBodyStyles() {
  return {
    width: "100vw",
    minHeight: "100vh",
    margin: "0",
    padding: "0",
    gap: "0",
    backgroundColor: "#ffffff",
    color: "#111111",
  };
}

function createPageId(): string {
  return `page_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug.length >= 3 ? slug.slice(0, 80).replace(/-+$/g, "") : "page";
}

function normalizePublishedPathCandidates(path: string): string[] {
  const normalized = decodeURIComponent(path).replace(/^\/+/, "");
  if (!normalized) return [normalized];
  return [`/${normalized}`, normalized];
}
