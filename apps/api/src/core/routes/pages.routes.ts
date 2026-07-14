import type { FastifyInstance, FastifyReply } from "fastify";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import { PageActionService } from "../modules/pages/page-actions.ts";
import { readSiteAsset, saveSiteAsset } from "../modules/pages/site-asset-service.ts";
import { PageService } from "../modules/pages/page-service.ts";
import { SiteProjectArchiveService, type SiteProjectArchive } from "../modules/pages/site-project-archive-service.ts";
import { SiteService } from "../modules/pages/site-service.ts";
import type { CreatePageInput, FabricPage, UpdatePageInput } from "../modules/pages/page-types.ts";
import { activeProfileRuntime } from "../profiles/active-profile-runtime.ts";
import { fabricHomePaths } from "../runtime/fabric-home.ts";

interface PageActionServiceLike {
  submitAction: PageActionService["submitAction"];
  submitPreviewAction?: PageActionService["submitPreviewAction"];
}

export interface PagesRoutesOptions {
  getActiveProfileId?: () => string;
  actionService?: PageActionServiceLike;
  assetStorageRoot?: string;
}

export default async function pagesRoutes(
  fastify: FastifyInstance,
  options: PagesRoutesOptions = {},
) {
  const sendResponse = <T>(reply: FastifyReply, response: ApiResponse<T>) => {
    return reply.code(response.status_code).send(response);
  };

  const getProfileId =
    options.getActiveProfileId ??
    (() => activeProfileRuntime.activeProfileService.getActiveProfile()?.id ?? "default");
  const actionService = options.actionService ?? new PageActionService();
  const assetStorageRoot = options.assetStorageRoot ?? `${fabricHomePaths.dataDir}/site-assets`;
  const getService = () => new PageService({ profileId: getProfileId() });
  const getSiteService = () => new SiteService({ profileId: getProfileId() });

  fastify.get("/sites", async (_req, reply) => {
    return sendResponse(reply, {
      status_code: 200,
      message: "Sites fetched successfully",
      error: null,
      data: getSiteService().listSites(),
    });
  });

  fastify.post("/sites", async (req, reply) => {
    try {
      const body = req.body as { name?: string; slug?: string };
      const site = getSiteService().createSite({
        name: String(body.name ?? ""),
        slug: body.slug,
      });
      return sendResponse(reply, {
        status_code: 201,
        message: "Site created successfully",
        error: null,
        data: site,
      });
    } catch (error) {
      return sendResponse(reply, badRequest("Failed to create site", error));
    }
  });

  fastify.get("/sites/:siteId", async (req, reply) => {
    const { siteId } = req.params as { siteId: string };
    const site = getSiteService().getSite(siteId);
    if (!site) return sendResponse(reply, notFound("Site not found"));
    return sendResponse(reply, {
      status_code: 200,
      message: "Site fetched successfully",
      error: null,
      data: site,
    });
  });

  fastify.put("/sites/:siteId", async (req, reply) => {
    const { siteId } = req.params as { siteId: string };
    try {
      const site = getSiteService().updateSite(siteId, req.body as { name?: string; slug?: string; homePageId?: string | null });
      return sendResponse(reply, {
        status_code: 200,
        message: "Site updated successfully",
        error: null,
        data: site,
      });
    } catch (error) {
      return sendResponse(reply, routeError(error, "Site not found", "Failed to update site"));
    }
  });

  fastify.delete("/sites/:siteId", async (req, reply) => {
    const { siteId } = req.params as { siteId: string };
    const deleted = getSiteService().deleteSite(siteId);
    if (!deleted) return sendResponse(reply, notFound("Site not found"));
    return sendResponse(reply, {
      status_code: 200,
      message: "Site deleted successfully",
      error: null,
      data: null,
    });
  });

  fastify.get("/sites/:siteId/pages", async (req, reply) => {
    const { siteId } = req.params as { siteId: string };
    if (!getSiteService().getSite(siteId)) return sendResponse(reply, notFound("Site not found"));
    return sendResponse(reply, {
      status_code: 200,
      message: "Site pages fetched successfully",
      error: null,
      data: getSiteService().listPages(siteId),
    });
  });

  fastify.post("/sites/:siteId/pages", async (req, reply) => {
    const { siteId } = req.params as { siteId: string };
    try {
      const body = req.body as Partial<CreatePageInput>;
      const page = getSiteService().createPage(siteId, {
        title: String(body.title ?? ""),
        slug: body.slug,
        publicPath: body.publicPath,
        metaTitle: body.metaTitle,
        metaDescription: body.metaDescription,
        faviconUrl: body.faviconUrl,
        bodyStyles: body.bodyStyles,
        blocks: body.blocks,
      });
      return sendResponse<FabricPage>(reply, {
        status_code: 201,
        message: "Site page created successfully",
        error: null,
        data: page,
      });
    } catch (error) {
      return sendResponse(reply, routeError(error, "Site not found", "Failed to create site page"));
    }
  });

  fastify.post("/sites/:siteId/files", async (req, reply) => {
    const { siteId } = req.params as { siteId: string };
    try {
      const body = req.body as { path?: string; kind?: "folder" | "file" | "asset"; content?: string };
      const site = getSiteService().createProjectFile(siteId, {
        path: String(body.path ?? ""),
        kind: body.kind ?? "file",
        content: body.content,
      });
      return sendResponse(reply, {
        status_code: 200,
        message: "Site file created successfully",
        error: null,
        data: site,
      });
    } catch (error) {
      return sendResponse(reply, routeError(error, "Site not found", "Failed to create site file"));
    }
  });

  fastify.put("/sites/:siteId/files", async (req, reply) => {
    const { siteId } = req.params as { siteId: string };
    try {
      const body = req.body as { path?: string; content?: string };
      const site = getSiteService().updateProjectFile(siteId, String(body.path ?? ""), String(body.content ?? ""));
      return sendResponse(reply, {
        status_code: 200,
        message: "Site file updated successfully",
        error: null,
        data: site,
      });
    } catch (error) {
      return sendResponse(reply, routeError(error, "Site not found", "Failed to update site file"));
    }
  });

  fastify.delete("/sites/:siteId/files", async (req, reply) => {
    const { siteId } = req.params as { siteId: string };
    try {
      const body = req.body as { path?: string };
      const site = getSiteService().deleteProjectFile(siteId, String(body.path ?? ""));
      return sendResponse(reply, {
        status_code: 200,
        message: "Site file deleted successfully",
        error: null,
        data: site,
      });
    } catch (error) {
      return sendResponse(reply, routeError(error, "Site not found", "Failed to delete site file"));
    }
  });

  fastify.post("/sites/:siteId/assets", async (req, reply) => {
    const { siteId } = req.params as { siteId: string };
    const multipartReq = req as typeof req & {
      isMultipart?: () => boolean;
      file?: (options?: unknown) => Promise<{
        filename: string;
        mimetype?: string;
        toBuffer: () => Promise<Buffer>;
      } | undefined>;
    };

    if (!multipartReq.isMultipart?.()) {
      return sendResponse(reply, {
        status_code: 400,
        message: "Expected multipart site asset upload",
        error: "multipart_required",
        data: null,
      });
    }

    try {
      if (!getSiteService().getSite(siteId)) return sendResponse(reply, notFound("Site not found"));
      const uploaded = await multipartReq.file?.({ limits: { fileSize: 10 * 1024 * 1024 } });
      if (!uploaded) {
        return sendResponse(reply, {
          status_code: 400,
          message: "Missing site asset upload file",
          error: "file_required",
          data: null,
        });
      }
      const asset = saveSiteAsset({
        storageRoot: assetStorageRoot,
        profileId: getProfileId(),
        siteId,
        filename: uploaded.filename,
        buffer: await uploaded.toBuffer(),
        mimeType: uploaded.mimetype ?? "application/octet-stream",
      });
      const site = getSiteService().createProjectFile(siteId, asset);
      return sendResponse(reply, {
        status_code: 200,
        message: "Site asset uploaded successfully",
        error: null,
        data: { site, asset },
      });
    } catch (error) {
      return sendResponse(reply, badRequest("Failed to upload site asset", error));
    }
  });

  fastify.get("/sites/:siteId/assets/*", async (req, reply) => {
    const { siteId, "*": assetPath } = req.params as { siteId: string; "*": string };
    try {
      if (!getSiteService().getSite(siteId)) return reply.code(404).send("Site not found");
      const asset = readSiteAsset({
        storageRoot: assetStorageRoot,
        profileId: getProfileId(),
        siteId,
        assetPath,
      });
      if (!asset) return reply.code(404).send("Asset not found");
      return reply.code(200).send(asset);
    } catch {
      return reply.code(400).send("Invalid asset path");
    }
  });

  fastify.get("/sites/:siteId/export", async (req, reply) => {
    const { siteId } = req.params as { siteId: string };
    try {
      const archiveService = new SiteProjectArchiveService({ assetStorageRoot });
      const archive = archiveService.exportSite(getProfileId(), siteId);
      const zip = archiveService.exportSiteZip(getProfileId(), siteId);
      return reply
        .code(200)
        .type("application/zip")
        .header("content-disposition", `attachment; filename="${archive.manifest.site.slug}.fabric-site.zip"`)
        .send(zip);
    } catch (error) {
      return sendResponse(reply, routeError(error, "Site not found", "Failed to export site"));
    }
  });

  fastify.post("/sites/import", async (req, reply) => {
    try {
      const archiveService = new SiteProjectArchiveService({ assetStorageRoot });
      const multipartReq = req as typeof req & {
        isMultipart?: () => boolean;
        file?: (options?: unknown) => Promise<{
          filename: string;
          mimetype?: string;
          toBuffer: () => Promise<Buffer>;
        } | undefined>;
      };
      let archive = req.body as SiteProjectArchive;

      if (multipartReq.isMultipart?.()) {
        const uploaded = await multipartReq.file?.({ limits: { fileSize: 50 * 1024 * 1024 } });
        if (!uploaded) throw new Error("Missing site project upload file.");
        archive = archiveService.archiveFromUpload(uploaded.filename, await uploaded.toBuffer());
      }

      const site = archiveService.importSite(getProfileId(), archive);
      return sendResponse(reply, {
        status_code: 201,
        message: "Site imported successfully",
        error: null,
        data: site,
      });
    } catch (error) {
      return sendResponse(reply, badRequest("Failed to import site", error));
    }
  });

  fastify.get("/pages", async (_req, reply) => {
    return sendResponse(reply, {
      status_code: 200,
      message: "Pages fetched successfully",
      error: null,
      data: getService().listPages(),
    });
  });

  fastify.post("/pages", async (req, reply) => {
    try {
      const body = req.body as Partial<CreatePageInput>;
      const page = getService().createPage({
        profileId: getProfileId(),
        title: String(body.title ?? ""),
        slug: body.slug,
        publicPath: body.publicPath,
        metaTitle: body.metaTitle,
        metaDescription: body.metaDescription,
        faviconUrl: body.faviconUrl,
        bodyStyles: body.bodyStyles,
        blocks: body.blocks,
      });
      return sendResponse<FabricPage>(reply, {
        status_code: 201,
        message: "Page created successfully",
        error: null,
        data: page,
      });
    } catch (error) {
      return sendResponse(reply, badRequest("Failed to create page", error));
    }
  });

  fastify.get("/pages/:pageId", async (req, reply) => {
    const { pageId } = req.params as { pageId: string };
    const page = getService().getPage(pageId);
    if (!page) return sendResponse(reply, notFound("Page not found"));
    return sendResponse(reply, {
      status_code: 200,
      message: "Page fetched successfully",
      error: null,
      data: page,
    });
  });

  fastify.put("/pages/:pageId", async (req, reply) => {
    const { pageId } = req.params as { pageId: string };
    try {
      const page = getService().updatePage(pageId, req.body as UpdatePageInput);
      return sendResponse(reply, {
        status_code: 200,
        message: "Page updated successfully",
        error: null,
        data: page,
      });
    } catch (error) {
      return sendResponse(reply, routeError(error, "Page not found", "Failed to update page"));
    }
  });

  fastify.delete("/pages/:pageId", async (req, reply) => {
    const { pageId } = req.params as { pageId: string };
    const deleted = getService().deletePage(pageId);
    if (!deleted) return sendResponse(reply, notFound("Page not found"));
    return sendResponse(reply, {
      status_code: 200,
      message: "Page deleted successfully",
      error: null,
      data: null,
    });
  });

  fastify.post("/pages/:pageId/publish", async (req, reply) => {
    const { pageId } = req.params as { pageId: string };
    try {
      const page = getService().publishPage(pageId);
      return sendResponse(reply, {
        status_code: 200,
        message: "Page published successfully",
        error: null,
        data: page,
      });
    } catch (error) {
      return sendResponse(reply, routeError(error, "Page not found", "Failed to publish page"));
    }
  });

  fastify.post("/pages/:pageId/unpublish", async (req, reply) => {
    const { pageId } = req.params as { pageId: string };
    try {
      const status = getService().unpublishPage(pageId);
      return sendResponse(reply, {
        status_code: 200,
        message: "Page unpublished successfully",
        error: null,
        data: status,
      });
    } catch (error) {
      return sendResponse(reply, routeError(error, "Page not found", "Failed to unpublish page"));
    }
  });

  fastify.get("/pages/:pageId/preview", async (req, reply) => {
    const { pageId } = req.params as { pageId: string };
    const html = getService().renderPreview(pageId);
    if (!html) return reply.code(404).send("Page not found");
    return reply.code(200).type("text/html").send(html);
  });

  fastify.post("/pages/:pageId/actions/:actionId", async (req, reply) => {
    const { pageId, actionId } = req.params as { pageId: string; actionId: string };
    if (!actionService.submitPreviewAction) {
      return sendResponse(reply, {
        status_code: 501,
        message: "Preview page actions are not available",
        error: "not_implemented",
        data: null,
      });
    }

    const result = await actionService.submitPreviewAction(getProfileId(), pageId, actionId, {
      body: req.body,
      headers: req.headers,
      ip: req.ip,
    });
    if (!result.ok) {
      return sendResponse(reply, {
        status_code: result.statusCode,
        message: result.message,
        error: result.message,
        data: null,
      });
    }
    return sendResponse(reply, {
      status_code: result.statusCode,
      message: "Page action accepted",
      error: null,
      data: {
        executionId: result.executionId,
        status: result.status ?? null,
        result: result.result ?? null,
      },
    });
  });

  fastify.get("/p/:siteId/*", async (req, reply) => {
    const { siteId } = req.params as { siteId: string };
    const slug = (req.params as { "*": string })["*"];
    const html = getService().renderPublished(siteId, slug);
    if (!html) return reply.code(404).send("Page not found");
    return reply.code(200).type("text/html").send(html);
  });

  fastify.post("/p/:siteId/actions/:actionId/*", async (req, reply) => {
    const { siteId, actionId } = req.params as { siteId: string; actionId: string };
    const slug = (req.params as { "*": string })["*"];
    const result = await actionService.submitAction(getProfileId(), slug, actionId, {
      body: req.body,
      headers: req.headers,
      ip: req.ip,
    }, { siteId });
    if (!result.ok) {
      return sendResponse(reply, {
        status_code: result.statusCode,
        message: result.message,
        error: result.message,
        data: null,
      });
    }
    return sendResponse(reply, {
      status_code: result.statusCode,
      message: "Page action accepted",
      error: null,
      data: {
        executionId: result.executionId,
        status: result.status ?? null,
        result: result.result ?? null,
      },
    });
  });
}

function notFound(message: string): ApiResponse<null> {
  return { status_code: 404, message, error: "not_found", data: null };
}

function badRequest(message: string, error: unknown): ApiResponse<null> {
  return {
    status_code: 400,
    message,
    error: error instanceof Error ? error.message : "bad_request",
    data: null,
  };
}

function routeError(error: unknown, notFoundMessage: string, fallbackMessage: string): ApiResponse<null> {
  const message = error instanceof Error ? error.message : "unknown_error";
  if (/not found/i.test(message)) {
    return notFound(notFoundMessage);
  }
  return { status_code: 400, message: fallbackMessage, error: message, data: null };
}
