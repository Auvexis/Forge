import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";
import { processFormSubmission } from "../forms/form-submission.ts";
import { WorkflowEngine } from "../workflows/executor.ts";
import { WorkflowRepository } from "../workflows/repository.ts";
import { PageRepository } from "./page-repository.ts";
import { SiteRepository } from "./site-repository.ts";
import type { PageBlock, PageBlockAction, PublishedPage } from "./page-types.ts";

type PageActionResult =
  | { ok: true; statusCode: 202; executionId: string }
  | { ok: false; statusCode: number; message: string };

interface PageActionRequestLike {
  body?: unknown;
  headers: Record<string, unknown>;
  ip: string;
}

interface PageActionDependencies {
  getPublishedPageBySlug: (profileId: string, slug: string, siteId?: string) => PublishedPage | null;
  getDraftPageById: (profileId: string, pageId: string) => PublishedPage | null;
  resolveSiteId: (profileId: string, siteIdOrPublicId: string) => string | null;
  processFormSubmission: typeof processFormSubmission;
  getWorkflowById: (id: string) => WorkflowItem | null;
  executeWorkflowFromTrigger: typeof WorkflowEngine.executeWorkflowFromTrigger;
}

export class PageActionService {
  private readonly dependencies: PageActionDependencies;

  constructor(dependencies: Partial<PageActionDependencies> = {}) {
    this.dependencies = { ...defaultDependencies, ...dependencies };
  }

  async submitAction(
    profileId: string,
    pageSlug: string,
    actionId: string,
    req: PageActionRequestLike,
    options: { siteId?: string } = {},
  ): Promise<PageActionResult> {
    const siteId = options.siteId ? this.dependencies.resolveSiteId(profileId, options.siteId) : undefined;
    if (options.siteId && !siteId) {
      return { ok: false, statusCode: 404, message: "Published page not found" };
    }

    const page = this.dependencies.getPublishedPageBySlug(profileId, pageSlug, siteId ?? undefined);
    if (!page) {
      return { ok: false, statusCode: 404, message: "Published page not found" };
    }

    return this.submitResolvedPageAction(page, actionId, req);
  }

  async submitPreviewAction(
    profileId: string,
    pageId: string,
    actionId: string,
    req: PageActionRequestLike,
  ): Promise<PageActionResult> {
    const page = this.dependencies.getDraftPageById(profileId, pageId);
    if (!page) return { ok: false, statusCode: 404, message: "Page not found" };
    return this.submitResolvedPageAction(page, actionId, req);
  }

  private async submitResolvedPageAction(
    page: PublishedPage,
    actionId: string,
    req: PageActionRequestLike,
  ): Promise<PageActionResult> {
    const action = findAction(page.blocks, actionId);
    if (!action) {
      return { ok: false, statusCode: 404, message: "Page action not found" };
    }

    if (action.type === "openUrl") {
      return { ok: false, statusCode: 400, message: "Open URL actions run on the client" };
    }

    if (action.type === "submitForm") {
      const result = await this.dependencies.processFormSubmission(
        action.formId,
        { requireActive: true, mode: "prod" },
        req,
      );
      if (!result.ok) {
        return { ok: false, statusCode: result.statusCode, message: result.message };
      }
      return { ok: true, statusCode: 202, executionId: result.executionId };
    }

    const payloadResult = sanitizePayload(req.body ?? {});
    if (!payloadResult.ok) {
      return { ok: false, statusCode: 400, message: payloadResult.message };
    }

    const workflow = this.dependencies.getWorkflowById(action.workflowId);
    if (!workflow) {
      return { ok: false, statusCode: 404, message: "Workflow not found" };
    }
    if (!workflow.metadata.isActive || workflow.metadata.isDraft) {
      return { ok: false, statusCode: 400, message: "Workflow is not active" };
    }

    const executionId = `exec_page_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const triggerPayload = {
      fields: payloadResult.payload,
      page: { slug: page.slug, actionId },
      submittedAt: Date.now(),
      ip: req.ip,
      userAgent: req.headers["user-agent"] ?? "",
    };

    const execution = this.dependencies.executeWorkflowFromTrigger(
      workflow,
      action.triggerId ?? "trigger",
      triggerPayload,
      executionId,
    );
    execution.catch((err: Error) => {
      console.error(
        `[FABRIC | PAGES]: Workflow action failed for "${workflow.metadata.id}": ${err.message}`,
      );
    });

    return { ok: true, statusCode: 202, executionId };
  }
}

const defaultDependencies: PageActionDependencies = {
  getPublishedPageBySlug: PageRepository.getPublishedPageBySlug.bind(PageRepository),
  getDraftPageById: (profileId, pageId) => {
    const page = PageRepository.getPage(profileId, pageId);
    if (!page) return null;
    return {
      id: `preview_${page.id}`,
      pageId: page.id,
      profileId,
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
    };
  },
  resolveSiteId: (profileId, siteIdOrPublicId) =>
    SiteRepository.getSite(profileId, siteIdOrPublicId)?.id ??
    SiteRepository.getSiteByPublicId(profileId, siteIdOrPublicId)?.id ??
    null,
  processFormSubmission,
  getWorkflowById: WorkflowRepository.getWorkflowById,
  executeWorkflowFromTrigger: WorkflowEngine.executeWorkflowFromTrigger,
};

function findAction(blocks: PageBlock[], actionId: string): PageBlockAction | null {
  for (const block of blocks) {
    if (block.action?.id === actionId) return block.action;
    const childAction = findAction(block.children ?? [], actionId);
    if (childAction) return childAction;
  }
  return null;
}

function sanitizePayload(
  payload: unknown,
): { ok: true; payload: Record<string, unknown> } | { ok: false; message: string } {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: true, payload: {} };
  }

  const entries = Object.entries(payload as Record<string, unknown>);
  if (entries.length > 50) {
    return { ok: false, message: "Payload has too many keys" };
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of entries) {
    if (!/^[a-zA-Z0-9_.-]{1,80}$/.test(key)) continue;
    const valueResult = sanitizePayloadValue(value, 1);
    if (!valueResult.ok) return valueResult;
    sanitized[key] = valueResult.value;
  }
  return { ok: true, payload: sanitized };
}

function sanitizePayloadValue(
  value: unknown,
  depth: number,
): { ok: true; value: unknown } | { ok: false; message: string } {
  if (depth > 6) {
    return { ok: false, message: "Payload is too deeply nested" };
  }
  if (typeof value === "string") {
    if (value.length > 8 * 1024) {
      return { ok: false, message: "Payload string value exceeds 8 KB" };
    }
    return { ok: true, value };
  }
  if (value === null || typeof value === "number" || typeof value === "boolean") {
    return { ok: true, value };
  }
  if (Array.isArray(value)) {
    const next = [];
    for (const item of value.slice(0, 50)) {
      const itemResult = sanitizePayloadValue(item, depth + 1);
      if (!itemResult.ok) return itemResult;
      next.push(itemResult.value);
    }
    return { ok: true, value: next };
  }
  if (typeof value === "object") {
    const objectEntries = Object.entries(value as Record<string, unknown>);
    if (objectEntries.length > 50) {
      return { ok: false, message: "Payload has too many keys" };
    }
    const next: Record<string, unknown> = {};
    for (const [key, item] of objectEntries) {
      if (!/^[a-zA-Z0-9_.-]{1,80}$/.test(key)) continue;
      const itemResult = sanitizePayloadValue(item, depth + 1);
      if (!itemResult.ok) return itemResult;
      next[key] = itemResult.value;
    }
    return { ok: true, value: next };
  }

  return { ok: true, value: null };
}
