import { PageRepository } from "./page-repository.ts";
import { renderPublishedPage } from "./page-renderer.ts";
import { validatePageInput } from "./page-validation.ts";
import type { CreatePageInput, PublishedPage, SailorPage, UpdatePageInput } from "./page-types.ts";

export interface SailorPageSummary {
  id: string;
  title: string;
  slug: string;
  updatedAt: string;
  publishedAt: string | null;
}

export class PageService {
  private readonly profileId: string;

  constructor(options: { profileId: string }) {
    this.profileId = options.profileId;
    PageRepository.ensureSchema();
  }

  listPages(): SailorPageSummary[] {
    return PageRepository.listPages(this.profileId).map((page) => ({
      id: page.id,
      title: page.title,
      slug: page.slug,
      updatedAt: page.updatedAt,
      publishedAt: PageRepository.getPublishedPageByPageId(this.profileId, page.id)?.publishedAt ?? null,
    }));
  }

  createPage(input: CreatePageInput): SailorPage {
    const now = new Date().toISOString();
    const page: SailorPage = {
      id: createPageId(),
      profileId: this.profileId,
      title: input.title,
      slug: input.slug ?? this.createUniqueSlug(input.title),
      bodyStyles: { backgroundColor: "#ffffff", color: "#111111" },
      blocks: input.blocks ?? [],
      createdAt: now,
      updatedAt: now,
    };

    return this.validateAndSave(page);
  }

  getPage(id: string): SailorPage | null {
    return PageRepository.getPage(this.profileId, id);
  }

  updatePage(id: string, input: UpdatePageInput): SailorPage {
    const existing = this.getPage(id);
    if (!existing) {
      throw new Error("Page not found.");
    }

    const page: SailorPage = {
      ...existing,
      title: input.title ?? existing.title,
      slug: input.slug ?? existing.slug,
      bodyStyles: input.bodyStyles ?? existing.bodyStyles,
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
      title: validation.page.title,
      slug: validation.page.slug,
      bodyStyles: validation.page.bodyStyles,
      blocks: validation.page.blocks,
      publishedAt: new Date().toISOString(),
    };

    return PageRepository.savePublishedPage(published);
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
      title: page.title,
      slug: page.slug,
      bodyStyles: page.bodyStyles,
      blocks: page.blocks,
      publishedAt: new Date().toISOString(),
    });
  }

  renderPublished(slug: string): string | null {
    const page = PageRepository.getPublishedPageBySlug(this.profileId, slug);
    return page ? renderPublishedPage(page) : null;
  }

  private validateAndSave(page: SailorPage): SailorPage {
    const validation = validatePageInput(page);
    if (!validation.success) {
      throw new Error(validation.error);
    }
    return PageRepository.savePage(validation.page);
  }

  private createUniqueSlug(title: string): string {
    const baseSlug = slugify(title);
    let slug = baseSlug;
    let suffix = 2;
    while (PageRepository.getPageBySlug(this.profileId, slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
    return slug;
  }
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
